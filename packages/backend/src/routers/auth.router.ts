import Router from 'koa-router';
import { Context, DefaultState } from 'koa';
import { config } from '@/config';
import { AuthService, type StoredOAuthState } from '@/services/auth.service';
import { RegisteredUserService } from '@/services/registered-user.service';
import { logger } from '@/lib/logger';

const router = new Router<DefaultState, Context>({ prefix: '/auth' });

function getFrontendCallbackUrl(
    frontendOrigin: string,
    params: Record<string, string | number | undefined>
) {
    const template = new URL(config.auth.cpOAuth.frontendRedirectUri, 'http://localhost');
    const callbackUrl = new URL(frontendOrigin);
    callbackUrl.pathname = template.pathname;
    callbackUrl.search = template.search;
    callbackUrl.hash = template.hash;
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) callbackUrl.searchParams.set(key, String(value));
    }
    return callbackUrl.toString();
}

router.get('/cp/login', async (ctx: Context) => {
    const frontendOrigin = ctx.query.frontendOrigin;
    if (!AuthService.isAllowedFrontendOrigin(frontendOrigin)) {
        ctx.fail(400, 'Invalid or disallowed frontend origin');
        return;
    }

    try {
        ctx.redirect(await AuthService.createAuthorizationUrl(ctx.query.redirect, frontendOrigin));
    } catch (error) {
        logger.error({ error }, 'Failed to create CP OAuth authorization URL');
        ctx.fail(500, error instanceof Error ? error.message : 'Failed to start CP OAuth login');
    }
});

router.get('/cp/callback', async (ctx: Context) => {
    const state = ctx.query.state;
    if (typeof state !== 'string' || !state) {
        ctx.fail(400, 'Missing or invalid OAuth state');
        return;
    }

    let storedState: StoredOAuthState | null;
    try {
        storedState = await AuthService.consumeState(state);
    } catch (error) {
        logger.error({ error }, 'Failed to consume CP OAuth state');
        ctx.fail(500, 'Failed to complete CP OAuth login');
        return;
    }

    if (!storedState) {
        ctx.fail(400, 'Invalid or expired OAuth state');
        return;
    }

    const { frontendOrigin, redirect, codeVerifier } = storedState;
    const error = ctx.query.error;
    if (typeof error === 'string' && error) {
        const description = ctx.query.error_description;
        ctx.redirect(
            getFrontendCallbackUrl(frontendOrigin, {
                error,
                message: typeof description === 'string' && description ? description : error
            })
        );
        return;
    }

    const code = ctx.query.code;
    if (error !== undefined || typeof code !== 'string' || !code) {
        ctx.redirect(getFrontendCallbackUrl(frontendOrigin, { error: 'invalid_request' }));
        return;
    }

    try {
        const result = await AuthService.completeCpOAuthLogin(code, codeVerifier);
        ctx.redirect(
            getFrontendCallbackUrl(frontendOrigin, {
                token: result.token,
                uid: result.uid,
                role: result.role,
                redirect
            })
        );
    } catch (callbackError) {
        logger.error({ callbackError }, 'Failed to complete CP OAuth login');
        ctx.redirect(
            getFrontendCallbackUrl(frontendOrigin, {
                error: 'login_failed',
                message:
                    callbackError instanceof Error
                        ? callbackError.message
                        : 'Failed to complete CP OAuth login'
            })
        );
    }
});

router.get('/me', async (ctx: Context) => {
    if (!ctx.user || ctx.user.id === undefined) {
        ctx.fail(401, 'Unauthorized');
        return;
    }

    const registeredUser = await RegisteredUserService.getById(ctx.user.id);
    ctx.success({ uid: ctx.user.id, role: ctx.user.role, registeredUser });
});

export default router;
