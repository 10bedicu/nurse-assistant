"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isFetching: boolean;
  children: React.ReactNode;
  className?: string;
}

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  isFetching,
  children,
  className,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentTarget = observerTarget.current;

    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(currentTarget);

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isFetching, onLoadMore]);

  return (
    <div className={className}>
      {children}
      <div
        ref={observerTarget}
        className="h-10 flex items-center justify-center"
      >
        {isFetching && hasMore && (
          <div className="text-sm text-muted-foreground">Loading more...</div>
        )}
      </div>
    </div>
  );
}
