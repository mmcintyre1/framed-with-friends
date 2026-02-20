export const PRESET_AVATARS = [
  '🐶','🐱','🐼','🦊','🐸','🐧',
  '🦁','🐯','🐻','🦄','🐷','🦋',
  '🌟','🎃','🎭','🎮','🚀','🌈',
  '🍕','🌺','🎸','⚡','🔥','👾',
]

const SIZE = {
  xs: { wrap: 'w-5 h-5', text: 'text-xs', emoji: 'text-xs' },
  sm: { wrap: 'w-7 h-7', text: 'text-xs', emoji: 'text-base' },
  md: { wrap: 'w-9 h-9', text: 'text-sm', emoji: 'text-xl' },
  lg: { wrap: 'w-12 h-12', text: 'text-base', emoji: 'text-2xl' },
}

export default function Avatar({ avatar, name, size = 'sm' }) {
  const s = SIZE[size] || SIZE.sm

  if (avatar?.startsWith('http')) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${s.wrap} rounded-full object-cover flex-shrink-0`}
      />
    )
  }

  if (avatar) {
    return (
      <div className={`${s.wrap} rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 ${s.emoji}`}>
        {avatar}
      </div>
    )
  }

  return (
    <div className={`${s.wrap} rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 ${s.text} font-medium text-zinc-400`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
