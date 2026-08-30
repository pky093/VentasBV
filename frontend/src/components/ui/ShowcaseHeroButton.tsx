import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface ShowcaseHeroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'whatsapp';
  size?: 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ShowcaseHeroButton: React.FC<ShowcaseHeroButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    md: 'py-2.5 px-5 text-xs tracking-wider',
    lg: 'py-3.5 px-8 text-xs sm:text-sm tracking-wider',
    xl: 'py-4 px-10 text-sm sm:text-base tracking-widest',
  }[size];

  // Base styling: Bold, high-contrast, responsive, interactive scale
  const baseClasses = 'relative inline-flex items-center justify-center font-black uppercase select-none transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  // Variant styling:
  // Primary: Vibrant Yellow base, turns into high-impact brand glowing primary on hover!
  const variantClasses = {
    primary: `
      bg-[#f3c623] text-black border border-transparent
      hover:bg-[#2563eb] hover:text-white hover:border-blue-400
      hover:shadow-[0_10px_30px_rgba(37,99,235,0.45)]
      hover:scale-[1.02]
    `,
    whatsapp: `
      bg-[#25d366] text-black border border-transparent
      hover:bg-[#128c7e] hover:text-white hover:border-emerald-300
      hover:shadow-[0_10px_30px_rgba(37,211,102,0.45)]
      hover:scale-[1.02]
    `,
    secondary: `
      bg-black/50 text-white border border-white/20
      hover:bg-[#2563eb] hover:text-white hover:border-blue-400
      hover:shadow-[0_8px_25px_rgba(37,99,235,0.35)]
      hover:scale-[1.02]
    `,
    outline: `
      bg-transparent text-white border border-white/30
      hover:bg-[#2563eb] hover:text-white hover:border-blue-400
      hover:shadow-[0_8px_20px_rgba(37,99,235,0.3)]
      hover:scale-[1.02]
    `,
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex items-center mr-2 shrink-0">{icon}</span>}
      <span>{children}</span>
      {iconRight && <span className="inline-flex items-center ml-2 shrink-0">{iconRight}</span>}
    </button>
  );
};
