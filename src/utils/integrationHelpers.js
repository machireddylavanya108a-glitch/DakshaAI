export function buildIntegrationCatalog() {
  return [
    {
      category: 'Productivity',
      integrations: [
        { name: 'Google Workspace', slug: 'google-workspace', type: 'productivity', status: 'ready' },
        { name: 'Microsoft 365', slug: 'microsoft-365', type: 'productivity', status: 'ready' },
        { name: 'Notion', slug: 'notion', type: 'productivity', status: 'ready' },
        { name: 'Slack', slug: 'slack', type: 'productivity', status: 'ready' },
        { name: 'Discord', slug: 'discord', type: 'productivity', status: 'ready' }
      ]
    },
    {
      category: 'Cloud Storage',
      integrations: [
        { name: 'Google Drive', slug: 'google-drive', type: 'storage', status: 'ready' },
        { name: 'Dropbox', slug: 'dropbox', type: 'storage', status: 'ready' },
        { name: 'OneDrive', slug: 'onedrive', type: 'storage', status: 'ready' },
        { name: 'Amazon S3', slug: 'amazon-s3', type: 'storage', status: 'ready' }
      ]
    },
    {
      category: 'Developer',
      integrations: [
        { name: 'GitHub', slug: 'github', type: 'developer', status: 'ready' },
        { name: 'GitLab', slug: 'gitlab', type: 'developer', status: 'ready' },
        { name: 'VS Code', slug: 'vs-code', type: 'developer', status: 'ready' },
        { name: 'Docker', slug: 'docker', type: 'developer', status: 'ready' }
      ]
    },
    {
      category: 'AI Providers',
      integrations: [
        { name: 'OpenAI', slug: 'openai', type: 'ai-provider', status: 'ready' },
        { name: 'Gemini', slug: 'gemini', type: 'ai-provider', status: 'ready' },
        { name: 'Claude', slug: 'claude', type: 'ai-provider', status: 'ready' },
        { name: 'DeepSeek', slug: 'deepseek', type: 'ai-provider', status: 'ready' }
      ]
    },
    {
      category: 'Business',
      integrations: [
        { name: 'Stripe', slug: 'stripe', type: 'business', status: 'ready' },
        { name: 'PayPal', slug: 'paypal', type: 'business', status: 'ready' },
        { name: 'Shopify', slug: 'shopify', type: 'business', status: 'ready' },
        { name: 'Salesforce', slug: 'salesforce', type: 'business', status: 'ready' }
      ]
    }
  ];
}

export function createAutomationTemplate(name = 'New workflow') {
  return {
    name,
    trigger: { type: 'webhook', source: 'incoming-event' },
    actions: [
      { type: 'notify', target: 'slack' },
      { type: 'sync', target: 'database' }
    ],
    conditions: [{ type: 'contains', field: 'status', value: 'approved' }],
    variables: {},
    createdAt: new Date().toISOString()
  };
}

export function validateOAuthConfig(provider) {
  const supportedProviders = new Set(['google', 'microsoft', 'github', 'notion', 'slack']);
  return supportedProviders.has(String(provider || '').toLowerCase());
}
