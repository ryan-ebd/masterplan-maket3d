/**
 * Motif garis kontur topografi — elemen signature "Meja Studio Maket".
 * Dua bukit kontur bersarang; warna ikut currentColor, atur via className
 * (mis. "text-line" atau "text-primary/15") + posisi absolut + pointer-events-none.
 */
export function GarisKontur({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 640"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      className={className}
    >
      {/* Bukit utama */}
      <path d="M320 84c96-10 208 30 252 112 42 78 20 186-52 244-74 60-196 74-288 38C136 442 76 356 92 264c16-94 116-168 228-180Z" />
      <path d="M322 128c78-8 168 26 204 92 34 64 16 150-42 197-60 49-159 60-233 31-78-31-127-100-114-175 13-76 94-135 185-145Z" />
      <path d="M324 172c61-6 130 21 158 72 27 50 13 116-33 153-47 38-123 46-181 24-60-24-98-78-88-136 10-59 73-105 144-113Z" />
      <path d="M326 216c44-4 92 16 112 52 19 36 9 82-24 108-33 27-87 33-128 17-43-17-70-55-63-96 7-42 52-75 103-81Z" />
      <path d="M328 258c27-3 56 10 68 32 12 22 6 50-15 66-20 17-53 20-78 10-26-10-42-33-38-58 4-26 32-46 63-50Z" />
      {/* Bukit kecil */}
      <path d="M136 500c34-22 86-20 116 6 28 25 30 66 4 92-27 27-78 32-112 12-36-21-42-88-8-110Z" />
      <path d="M158 522c22-14 54-12 72 4 17 15 19 41 3 57-17 17-49 20-70 8-22-13-26-55-5-69Z" />
    </svg>
  );
}
