/** Section wrapper. It used to fade each section up as it scrolled into view,
 *  which left content invisible until JavaScript ran (and in background tabs).
 *  Content now renders immediately; the name and props stay so callers are
 *  unchanged. `delay` is accepted and ignored. */
export function MotionReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
