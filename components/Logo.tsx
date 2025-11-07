import React from "react";
import { cn } from "@/lib/util";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
    color?: string;
    /**
     * @default "w-8 h-8"
     */
    className?: string;
    size?: string | number;
}

function toSize(value: string | number): string {
    return typeof value === "number" ? `${value}px` : value;
}

/**
 * Decisioning Demo Logo
 * - Single-color, currentColor-driven SVG
 * - Size controlled via Tailwind classes (className) or explicit size prop (width/height)
 */
export function Logo({ color, className = "w-8 h-8", size, style, ...rest }: LogoProps) {
    const ariaHidden =
        !((rest as any)["aria-label"] || (rest as any)["aria-labelledby"] || rest.title || rest.role === "img");

    const finalStyle: React.CSSProperties = {
        ...(style || {}),
        ...(color ? { color } : {}),
        ...(size ? { width: toSize(size), height: toSize(size) } : {}),
    };

    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            style={finalStyle}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={ariaHidden}
            {...rest}
        >
            {/* Central decision core (diamond) */}
            <path d="M12 8 L16 12 L12 16 L8 12 Z" />

            {/* Connectors from core to channel nodes */}
            <path d="M9.7 10.3 L6.3 8" />
            <path d="M14.3 10.3 L17.7 8" />
            <path d="M12 14.6 L12 17.5" />

            {/* Channel nodes */}
            <circle cx="5.5" cy="7.5" r="1.3" />
            <circle cx="18.5" cy="7.5" r="1.3" />
            <circle cx="12" cy="18.5" r="1.3" />

            {/* Subtle outer framing for balance */}
            <path d="M12 2.75a9.25 9.25 0 1 1 0 18.5" opacity="0.24" />
        </svg>
    );
}