// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Media Lib',
  staticDirectories: ['static'],
  tagline: 'Self-Hosted, Private, Everywhere Available media library',
  url: 'https://we-kode.github.io',
  baseUrl: '/mml.project/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'we-kode', // Usually your GitHub org/user name.
  projectName: 'mml.project', // Usually your repo name.
  trailingSlash: false,

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Documentation',
          },
          {
            className: "header-github-board",
            "aria-label": "Project board",
            href: 'https://github.com/orgs/we-kode/projects/1',
            position: 'right',
          },
          {
            className: "header-github-issues",
            "aria-label": "Issues",
            href: 'https://github.com/we-kode/mml.project/issues',
            position: 'right',
          },
          {
            href: 'https://github.com/we-kode?q=mml.&type=all&language=&sort=',
            className: "header-github-link",
            "aria-label": "GitHub repository",
            position: 'right',
          },
          {
            className: "header-github-demo",
            "aria-label": "Demo",
            href: 'https://github.com/we-kode/mml.demo',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} WeKoDe`,
        links: [],
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
