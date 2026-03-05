'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton-table'
import { Settings, Building2, CalendarDays, Bell, Download, Plus, Check, X, Users } from 'lucide-react'
import { addPersonalProfile } from '@/app/actions/profile'
import type { Profile, TaxYear } from '@/types'
