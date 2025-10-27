const axios = require('axios');
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 2000 });
const issue = process.env.GITHUB_EVENT_PATH ? require(process.env.GITHUB_EVENT_PATH).issue : null;

async function handleIssue(issue) {
    if (!issue) return;
    const prompt = `Analyze this GitHub issue and propose a solution:\n\nTitle: ${issue.title}\n\nBody:\n${issue.body}`;

    try {
        const response = await limiter.schedule(() =>
            axios.post(
                'https://api.githubcopilot.com/v1/agent',
                { prompt },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
        );

        const result = response.data?.choices?.[0]?.message?.content || 'No response.';
        await axios.post(
            issue.comments_url,
            { body: `🤖 **Copilot Vorschlag:**\n\n${result}` },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (err) {
        console.error('Error:', err.message);
    }
}

handleIssue(issue);
