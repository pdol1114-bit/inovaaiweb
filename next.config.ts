import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // 이 줄을 추가하세요!
  images: {
    unoptimized: true, // 정적 배포 시 이미지 최적화 기능을 꺼야 합니다.
  },
  // 기존 설정들...
};

export default nextConfig;