"use client";

import { motion } from "framer-motion";

interface QRBadgeProps {
    type: "ios" | "android";
    url: string;
}

export function QRBadge({ type, url }: QRBadgeProps) {
    const isIOS = type === "ios";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-[200px]"
        >
            <div className="bg-gray-50 p-2 rounded-xl mb-4">
                <img
                    src={qrUrl}
                    alt={`${type} QR Code`}
                    className="w-32 h-32"
                    loading="lazy"
                />
            </div>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
            >
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors">
                    {isIOS ? (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .76-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.36 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[10px] leading-none opacity-80">Download on the</p>
                                <p className="text-sm font-bold leading-tight">App Store</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.1-.12c-.285-.341-.443-.76-.443-1.199V3.133c0-.44.158-.858.443-1.199a.997.997 0 0 1 .1-.12zM14.5 12.707l2.844 2.844-3.565 1.189-1.956-1.955 2.677-2.078zm2.844-4.26l-2.844 2.843-2.677-2.078 1.956-1.956 3.565 1.191zm-4.26-4.26l-1.955 1.956L3.89 12l7.239 5.857 1.955 1.956 5.857-7.813L13.084 4.187z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[10px] leading-none opacity-80">GET IT ON</p>
                                <p className="text-sm font-bold leading-tight">Google Play</p>
                            </div>
                        </>
                    )}
                </div>
            </a>
        </motion.div>
    );
}
