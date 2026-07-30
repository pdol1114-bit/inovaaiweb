"use client";

import { useRef } from "react";

export function KBAuthMark() {
    const formRef = useRef<HTMLFormElement>(null);

    const handlePopKBAuthMark = () => {
        window.open(
            "",
            "KB_AUTHMARK",
            "height=604, width=648, status=yes, toolbar=no, menubar=no, location=no"
        );

        const form = formRef.current;
        if (!form) return;
        form.action = "https://okbfex.kbstar.com/quics";
        form.target = "KB_AUTHMARK";
        form.submit();
    };

    return (
        <>
            <form ref={formRef} method="get" className="hidden">
                <input type="hidden" name="page" value="C021590" />
                <input type="hidden" name="cc" value="b034066:b035526" />
                <input type="hidden" name="mHValue" value="3c180cdf6371b710b0da490a30fb9394" />
            </form>
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    handlePopKBAuthMark();
                }}
                className="inline-flex bg-white rounded-full p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            >
                <img
                    src="http://img1.kbstar.com/img/escrow/escrowcmark.gif"
                    alt="KB에스크로이체 인증마크"
                    className="border-0"
                />
            </a>
        </>
    );
}
