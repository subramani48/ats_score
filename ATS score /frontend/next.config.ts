import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs the self-contained server that `output: "standalone"` produces. It is only switched on
  // for the image build (NEXT_STANDALONE=true), so `npm run build` and `npm start` behave normally everywhere else.
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
};

export default nextConfig;
