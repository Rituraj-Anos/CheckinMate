"use client";

import Link from "next/link";
import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Links Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <Link
              href="https://github.com/checkinmate/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>

            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              About Team
            </Link>

            <Link
              href="mailto:support@checkinmate.com"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              Contact
            </Link>
          </div>

          {/* Copyright Section */}
          <div className="text-sm text-muted-foreground">
            <p>&copy; 2024 CheckinMate. Version 1.0</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
