'use client'

import { Building2, User, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface ProfileSwitcherProps {
  profiles: Profile[]
  currentProfile: Profile
  onSwitch: (profile: Profile) => void
}

function ProfileIcon({ type, className }: { type: string | null | undefined; className?: string }) {
  if (type === 'business') {
    return <Building2 className={cn('h-4 w-4 text-amber-500', className)} />
  }
  return <User className={cn('h-4 w-4 text-blue-400', className)} />
}

function profileTypeLabel(type: string | null | undefined): string {
  if (type === 'business') return 'Business'
  if (type === 'personal') return 'Personal'
  return 'Personal'
}

export function ProfileSwitcher({ profiles, currentProfile, onSwitch }: ProfileSwitcherProps) {
  // Group: business first, then personal alphabetically
  const sorted = [...profiles].sort((a, b) => {
    if (a.type === 'business' && b.type !== 'business') return -1
    if (a.type !== 'business' && b.type === 'business') return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors shadow-sm">
          <ProfileIcon type={currentProfile.type} />
          <span className="max-w-[120px] truncate">{currentProfile.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800">
        {sorted.map((profile, idx) => {
          const isActive = profile.id === currentProfile.id
          // Add separator before first personal profile
          const prevProfile = sorted[idx - 1]
          const showSep = idx > 0 && prevProfile?.type === 'business' && profile.type !== 'business'

          return (
            <div key={profile.id}>
              {showSep && <DropdownMenuSeparator className="bg-gray-800" />}
              <DropdownMenuItem
                onClick={() => onSwitch(profile)}
                className={cn(
                  'flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-2',
                  isActive
                    ? 'bg-amber-500/10 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800'
                )}
              >
                <ProfileIcon type={profile.type} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile.name}</p>
                  <p className="text-xs text-gray-500">{profileTypeLabel(profile.type)}</p>
                </div>
                {isActive && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
              </DropdownMenuItem>
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
