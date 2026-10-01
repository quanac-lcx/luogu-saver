import { once } from 'node:events';
import { createServer } from 'node:http';
import Koa from 'koa';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSchema } from '../src/config/schemas/auth';
import { responseHelper } from '../src/middlewares/response';
import router from '../src/routers/auth.router';

const fixtures = vi.hoisted(() => ({
    config: {
        network: { timeout: 1000 },
        auth: {
            cpOAuth: {
                discoveryUrl: 'https://oauth.example/discovery',
                clientId: 'test-client',
                clientSecret: 'test-secret',
                redirectUri: 'https://api.example/auth/cp/callback',
                frontendRedirectUri: 'https://main.example/auth/callback?source=oauth',
                allowedFrontendOrigins: ['https://mirror.example'],
                scopes: ['openid', 'profile', 'link:luogu'],
                stateExpireSeconds: 600
            }
        }
    },
    states: new Map<string, string>(),
    tokenRequest: vi.fn()
}));

vi.mock('@/config', () => ({ config: fixtures.config }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/redis', () => ({
    redisClient: {
        async set(key: string, value: string) {
            fixtures.states.set(key, value);
        },
        async getdel(key: string) {
            const value = fixtures.states.get(key);
            fixtures.states.delete(key);
            return value ?? null;
        }
    }
}));
vi.mock('axios', () => ({
    default: {
        async get(url: string) {
            if (url === 'https://oauth.example/discovery') {
                return {
                    data: {
                        authorization_endpoint: 'https://oauth.example/authorize',
                        token_endpoint: 'https://oauth.example/token',
                        userinfo_endpoint: 'https://oauth.example/userinfo'
                    }
                };
            }
            if (url === 'https://oauth.example/userinfo') {
                return {
                    data: {
                        sub: 'test-subject',
                        linked_accounts: [{ platform: 'luogu', platformUid: '123' }]
                    }
                };
            }
            throw new Error(`Unexpected provider URL: ${url}`);
        },
        post: fixtures.tokenRequest
    }
}));
vi.mock('@/services/registered-user.service', () => ({
    RegisteredUserService: {
        async upsertCpOAuthUser() {
            return { id: 7, role: 3, token: 'local-login-token' };
        }
    }
}));

const app = new Koa();
app.use(responseHelper);
app.use(router.routes());
const server = createServer(app.callback());
let baseUrl: string;

beforeAll(async () => {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing HTTP listener');
    baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
    });
});

beforeEach(() => {
    fixtures.states.clear();
    fixtures.tokenRequest.mockReset();
    fixtures.tokenRequest.mockResolvedValue({ data: { access_token: 'provider-token' } });
    fixtures.config.auth.cpOAuth.frontendRedirectUri =
        'https://main.example/auth/callback?source=oauth';
    fixtures.config.auth.cpOAuth.allowedFrontendOrigins = ['https://mirror.example'];
});

async function startLogin(frontendOrigin: string, redirect = '/settings') {
    const query = new URLSearchParams({ frontendOrigin, redirect });
    const response = await fetch(`${baseUrl}/auth/cp/login?${query}`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    const authorizationUrl = new URL(response.headers.get('location')!);
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
        'https://api.example/auth/cp/callback'
    );
    return authorizationUrl.searchParams.get('state')!;
}

async function callback(state: string, query = 'code=authorization-code') {
    return fetch(`${baseUrl}/auth/cp/callback?state=${state}&${query}`, { redirect: 'manual' });
}

describe('origin-bound OAuth callbacks', () => {
    it('keeps simultaneous main and mirror logins bound to their own origins and paths', async () => {
        const mainState = await startLogin('https://main.example', '/article/1?tab=code#reply');
        const mirrorState = await startLogin('https://mirror.example', '/paste/2');
        const mirrorResponse = await callback(
            mirrorState,
            'code=mirror-code&frontendOrigin=https://main.example&redirect=/wrong'
        );
        const mainResponse = await callback(mainState);
        const mirrorUrl = new URL(mirrorResponse.headers.get('location')!);
        const mainUrl = new URL(mainResponse.headers.get('location')!);
        expect(mirrorUrl.origin).toBe('https://mirror.example');
        expect(mirrorUrl.pathname).toBe('/auth/callback');
        expect(mirrorUrl.searchParams.get('source')).toBe('oauth');
        expect(mirrorUrl.searchParams.get('redirect')).toBe('/paste/2');
        expect(mainUrl.origin).toBe('https://main.example');
        expect(mainUrl.searchParams.get('redirect')).toBe('/article/1?tab=code#reply');
    });

    it.each([
        '',
        'frontendOrigin=https://mirror.example.evil',
        'frontendOrigin=http://mirror.example',
        'frontendOrigin=https://mirror.example:8443',
        'frontendOrigin=https://mirror.example@evil.example',
        'frontendOrigin=https://mirror.example&frontendOrigin=https://main.example'
    ])('rejects a missing, disallowed, or ambiguous origin: %s', async query => {
        const response = await fetch(`${baseUrl}/auth/cp/login?${query}`, {
            redirect: 'manual',
            headers: { Origin: 'https://mirror.example', Referer: 'https://mirror.example/' }
        });
        expect((await response.json()).code).toBe(400);
        expect(response.headers.get('location')).toBeNull();
        expect(fixtures.states.size).toBe(0);
    });

    it.each([
        ['error=access_denied&error_description=Cancelled', 'access_denied'],
        ['', 'invalid_request'],
        ['code=one&code=two', 'invalid_request'],
        ['error=&code=authorization-code', 'invalid_request']
    ])('returns errors to the source and consumes state: %s', async (query, expectedError) => {
        const state = await startLogin('https://mirror.example');
        const response = await callback(state, query);
        const url = new URL(response.headers.get('location')!);
        expect(url.origin).toBe('https://mirror.example');
        expect(url.searchParams.get('error')).toBe(expectedError);
        expect(url.searchParams.has('token')).toBe(false);
        expect(fixtures.tokenRequest).not.toHaveBeenCalled();
        const replay = await callback(state);
        expect((await replay.json()).code).toBe(400);
        expect(replay.headers.get('location')).toBeNull();
        expect(fixtures.tokenRequest).not.toHaveBeenCalled();
    });

    it('returns provider failures to the source without permitting a replay', async () => {
        const state = await startLogin('https://mirror.example');
        fixtures.tokenRequest.mockRejectedValueOnce(new Error('Provider unavailable'));
        const response = await callback(state);
        const url = new URL(response.headers.get('location')!);
        expect(url.origin).toBe('https://mirror.example');
        expect(url.searchParams.get('error')).toBe('login_failed');
        expect(url.searchParams.has('token')).toBe(false);
        const replay = await callback(state);
        expect((await replay.json()).code).toBe(400);
        expect(replay.headers.get('location')).toBeNull();
        expect(fixtures.tokenRequest).toHaveBeenCalledTimes(1);
    });

    it('allows only one code exchange for concurrent callbacks with the same state', async () => {
        const state = await startLogin('https://mirror.example');
        const responses = await Promise.all([callback(state), callback(state)]);
        expect(responses.filter(response => response.status === 302)).toHaveLength(1);
        const rejected = responses.find(response => response.status !== 302)!;
        expect((await rejected.json()).code).toBe(400);
        expect(rejected.headers.get('location')).toBeNull();
        expect(fixtures.tokenRequest).toHaveBeenCalledTimes(1);
    });

    it('rejects a frontend removed from the whitelist before the callback', async () => {
        const state = await startLogin('https://mirror.example');
        fixtures.config.auth.cpOAuth.allowedFrontendOrigins = [];
        const response = await callback(state);
        expect((await response.json()).code).toBe(400);
        expect(response.headers.get('location')).toBeNull();
        expect(fixtures.tokenRequest).not.toHaveBeenCalled();
    });

    it.each(['', 'state=expired', 'state=one&state=two'])(
        'does not redirect invalid state: %s',
        async query => {
            const response = await fetch(
                `${baseUrl}/auth/cp/callback?${query}&error=access_denied&frontendOrigin=https://mirror.example`,
                { redirect: 'manual' }
            );
            expect((await response.json()).code).toBe(400);
            expect(response.headers.get('location')).toBeNull();
            expect(fixtures.tokenRequest).not.toHaveBeenCalled();
        }
    );

    it('supports a relative callback template on an explicitly allowed origin', async () => {
        fixtures.config.auth.cpOAuth.frontendRedirectUri = '/auth/callback?source=oauth#done';
        const state = await startLogin('https://mirror.example');
        const response = await callback(state);
        const url = new URL(response.headers.get('location')!);
        expect(url.origin).toBe('https://mirror.example');
        expect(url.pathname).toBe('/auth/callback');
        expect(url.searchParams.get('source')).toBe('oauth');
        expect(url.hash).toBe('#done');
    });

    it('does not interpret a double-slash callback pathname as another host', async () => {
        fixtures.config.auth.cpOAuth.frontendRedirectUri =
            'https://main.example//evil.example/callback';
        const state = await startLogin('https://mirror.example');
        const response = await callback(state);
        const url = new URL(response.headers.get('location')!);
        expect(url.origin).toBe('https://mirror.example');
        expect(url.pathname).toBe('//evil.example/callback');
    });
});

describe('frontend origin configuration', () => {
    it.each([
        'https://*.example',
        'https://mirror.example/',
        'https://user@mirror.example',
        'https://mirror.example?next=other',
        'https://mirror.example#fragment',
        'ftp://mirror.example'
    ])('rejects non-origin whitelist entries: %s', origin => {
        const result = AuthSchema.safeParse({ cpOAuth: { allowedFrontendOrigins: [origin] } });
        expect(result.success).toBe(false);
    });
});
