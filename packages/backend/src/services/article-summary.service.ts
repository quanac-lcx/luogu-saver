import { llm } from '@/lib/llm';

export class ArticleSummaryService {
    static async generate(content: string): Promise<string> {
        const prompt = `
<prompt>
Please provide a concise summary for the text in \`<content>\`.
The summary should always be in Chinese.
</prompt>
<content>
${content}
</content>
        `;

        const result = await llm.chat(
            [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            'summary'
        );

        return result.content || '';
    }
}
