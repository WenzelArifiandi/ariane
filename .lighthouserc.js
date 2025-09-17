module.exports = {
  ci: {
    collect: {
      // Use the Astro static output folder
      staticDistDir: "./site/dist",
      // List the routes you want to test (adjust as needed)
      url: [
        "/", // homepage
        "/about", // about page
        "/work", // work/projects page
      ],
    },
    assert: {
      // Example thresholds (tune later)
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      // Just print results to console (no external server)
      target: "temporary-public-storage",
    },
  },
};
