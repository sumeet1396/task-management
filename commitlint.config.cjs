module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'prefix-format': ({ header }) => {
          const valid = /^(feat|task|bug): \S.*/.test(header || '');
          return [
            valid,
            [
              'Invalid commit message.',
              'Format:  <type>: <short description>',
              'Types:   feat:  new feature',
              '         task:  chores, setup, refactors, docs',
              '         bug:   bug fix',
              'Example: feat: add task filtering by assignee',
            ].join('\n'),
          ];
        },
      },
    },
  ],
  rules: {
    // turn off the generic, less helpful rules
    'type-enum': [0],
    'type-empty': [0],
    'subject-empty': [0],
    'subject-case': [0],
    // one rule with a clear message
    'prefix-format': [2, 'always'],
  },
};
