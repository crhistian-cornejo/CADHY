/**
 * Box Loader Component - CADHY
 *
 * 3D animated stacked boxes loader for showing loading states.
 * Features 4 boxes with staggered falling animation.
 */

import { cn } from "@cadhy/ui"

interface BoxLoaderProps {
  className?: string
  message?: string
}

export function BoxLoader({ className, message = "Loading project..." }: BoxLoaderProps) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-background", className)}>
      <div className="flex flex-col items-center gap-8">
        {/* Stacked Boxes Animation */}
        <div className="boxes-container">
          <div className="boxes">
            <div className="box box-1">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
            <div className="box box-2">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
            <div className="box box-3">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
            <div className="box box-4">
              <div className="face face-front" />
              <div className="face face-right" />
              <div className="face face-top" />
              <div className="face face-back" />
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <div className="flex items-center gap-1">
            <span className="loading-dot" style={{ animationDelay: "0ms" }} />
            <span className="loading-dot" style={{ animationDelay: "150ms" }} />
            <span className="loading-dot" style={{ animationDelay: "300ms" }} />
          </div>
        </div>

        {/* Styles */}
        <style>{`
          .boxes-container {
            --box-size: 32px;
            --box-color: hsl(var(--primary));
            --box-color-light: hsl(var(--primary) / 0.6);
            --box-color-dark: hsl(var(--primary) / 0.8);
            width: 112px;
            height: 112px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .boxes {
            width: var(--box-size);
            height: var(--box-size);
            position: relative;
            transform-style: preserve-3d;
            transform: rotateX(-35deg) rotateY(45deg);
          }

          .box {
            width: 100%;
            height: 100%;
            position: absolute;
            transform-style: preserve-3d;
            animation: box-bounce 1s ease-in-out infinite;
          }

          .box-1 {
            animation-delay: 0s;
          }

          .box-2 {
            animation-delay: 0.1s;
          }

          .box-3 {
            animation-delay: 0.2s;
          }

          .box-4 {
            animation-delay: 0.3s;
          }

          .face {
            position: absolute;
            width: var(--box-size);
            height: var(--box-size);
          }

          .face-front {
            background: var(--box-color);
            transform: translateZ(calc(var(--box-size) / 2));
          }

          .face-back {
            background: var(--box-color-dark);
            transform: translateZ(calc(var(--box-size) / -2)) rotateY(180deg);
          }

          .face-right {
            background: var(--box-color-light);
            transform: translateX(calc(var(--box-size) / 2)) rotateY(90deg);
          }

          .face-top {
            background: var(--box-color-dark);
            transform: translateY(calc(var(--box-size) / -2)) rotateX(90deg);
          }

          @keyframes box-bounce {
            0% {
              transform: translate3d(0, 0, 0);
            }
            12.5% {
              transform: translate3d(0, calc(var(--box-size) * -1), 0);
            }
            25% {
              transform: translate3d(calc(var(--box-size) * -1), calc(var(--box-size) * -1), 0);
            }
            37.5% {
              transform: translate3d(calc(var(--box-size) * -1), 0, 0);
            }
            50% {
              transform: translate3d(calc(var(--box-size) * -1), 0, calc(var(--box-size) * -1));
            }
            62.5% {
              transform: translate3d(calc(var(--box-size) * -1), calc(var(--box-size) * -1), calc(var(--box-size) * -1));
            }
            75% {
              transform: translate3d(0, calc(var(--box-size) * -1), calc(var(--box-size) * -1));
            }
            87.5% {
              transform: translate3d(0, 0, calc(var(--box-size) * -1));
            }
            100% {
              transform: translate3d(0, 0, 0);
            }
          }

          .loading-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: hsl(var(--primary));
            animation: dot-pulse 1s ease-in-out infinite;
          }

          @keyframes dot-pulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            50% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default BoxLoader
