'use client'

import { useState } from 'react'
import { Building2, User, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Profile } from '@/types'

interface ProfileSwitcherProps {
  profiles: Profile[]
  currentProfile: Profile
  onSwitch: (profile: Profile) => void
}

export function ProfileSwitcher({ profiles, currentProfile, onSwitch }: ProfileSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          {currentProfile.type === 'business' ? (
            <Building2 className="h-4 w-4 text-amber-500" />
          ) : (
            <User className="h-4 w-4 text-blue-500" />
          )}
          <span>{currentProfile.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => onSwitch(profile)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {profile.type === 'business' ? (
              <Building2 className="h-4 w-4 text-amber-500" />
            ) : (
              <User className="h-4 w-4 text-blue-500" />
            )}
            <div>
              <p className="font-medium text-sm">{profile.name}</p>
              <p className="text-xs text-gray-400 capitalize">{profile.type}</p>
            </div>
            {profile.id === currentProfile.id && (
              <span className="ml-auto text-xs text-amber-500">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
