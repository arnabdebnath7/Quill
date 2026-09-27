export function QuillLogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-label="Quill logo"
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="96" fill="#1A3B32" />
        {/* Feather */}
        <path
          d="
            M 92 172
            C 84 158 68 138 65 110
            C 62 88 70 70 82 56
            C 94 42 116 28 148 18
            C 151 28 152 40 147 52
            C 142 62 134 70 126 76
            C 126 76 136 73 144 66
            C 144 66 140 76 132 82
            C 124 88 114 90 108 96
            C 108 96 118 94 126 88
            C 126 88 120 98 110 102
            C 100 106 92 108 88 114
            C 84 120 84 130 86 138
            C 88 148 90 162 92 172
            Z
          "
          fill="white"
        />
        {/* Rachis */}
        <path
          d="
            M 92 172
            C 94 150 100 130 108 114
            C 116 98 126 84 142 68
            C 130 80 120 92 112 106
            C 104 120 96 138 92 172
            Z
          "
          fill="#1A3B32"
        />
      </svg>
    </div>
  );
}
