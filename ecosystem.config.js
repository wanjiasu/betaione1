module.exports = {
  apps: [
    {
      name: "betaione",
      script: "pnpm",
      args: "run start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
  ],
};
