import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
    ...nextCoreWebVitals,
    {
        files: ['**/*.{ts,tsx}'],
        // components/icons.ts is the one place allowed to re-export from
        // lucide-react directly; everywhere else should go through the barrel.
        ignores: ['**/components/icons.ts'],
        rules: {
            // Encourage the icon barrel so we have a single source of truth
            // for which icons are actually used in the app. Warning (not error)
            // so existing files keep linting clean while new code follows the rule.
            'no-restricted-imports': [
                'warn',
                {
                    paths: [
                        {
                            name: 'lucide-react',
                            message:
                                'Import icons from "@/components/icons" instead. Add new icons to the barrel.',
                        },
                    ],
                    patterns: ['lucide-react/*'],
                },
            ],
        },
    },
];

export default eslintConfig;
