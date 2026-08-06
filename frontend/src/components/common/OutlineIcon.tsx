import React from 'react';
import {
  Building2,
  Palmtree,
  Home,
  Building,
  BedDouble,
  Bed,
  Crown,
  Sofa,
  Layers,
  Castle,
  Sparkles,
  Wrench,
  UserCheck,
  HelpCircle
} from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export const PropertyTypeIcon: React.FC<{ type?: string } & IconProps> = ({
  type,
  className = 'w-4 h-4',
  size,
  strokeWidth = 1.75
}) => {
  const normalizedType = (type || '').toUpperCase();

  switch (normalizedType) {
    case 'HOTEL':
      return <Building2 className={className} size={size} strokeWidth={strokeWidth} />;
    case 'RESORT':
      return <Palmtree className={className} size={size} strokeWidth={strokeWidth} />;
    case 'VILLA':
      return <Home className={className} size={size} strokeWidth={strokeWidth} />;
    case 'APARTMENT':
      return <Building className={className} size={size} strokeWidth={strokeWidth} />;
    case 'HOMESTAY':
      return <Home className={className} size={size} strokeWidth={strokeWidth} />;
    case 'GUESTHOUSE':
      return <BedDouble className={className} size={size} strokeWidth={strokeWidth} />;
    default:
      return <Building2 className={className} size={size} strokeWidth={strokeWidth} />;
  }
};

export const BedTypeIcon: React.FC<{ type?: string } & IconProps> = ({
  type,
  className = 'w-4 h-4',
  size,
  strokeWidth = 1.75
}) => {
  const normalizedType = (type || '').toLowerCase();

  if (normalizedType.includes('king') && !normalizedType.includes('super')) {
    return <Crown className={className} size={size} strokeWidth={strokeWidth} />;
  }
  if (normalizedType.includes('superking') || normalizedType.includes('super king')) {
    return <Castle className={className} size={size} strokeWidth={strokeWidth} />;
  }
  if (normalizedType.includes('queen')) {
    return <BedDouble className={className} size={size} strokeWidth={strokeWidth} />;
  }
  if (normalizedType.includes('double') || normalizedType.includes('đôi')) {
    return <BedDouble className={className} size={size} strokeWidth={strokeWidth} />;
  }
  if (normalizedType.includes('sofa')) {
    return <Sofa className={className} size={size} strokeWidth={strokeWidth} />;
  }
  if (normalizedType.includes('bunk') || normalizedType.includes('tầng')) {
    return <Layers className={className} size={size} strokeWidth={strokeWidth} />;
  }
  if (normalizedType.includes('single') || normalizedType.includes('đơn')) {
    return <Bed className={className} size={size} strokeWidth={strokeWidth} />;
  }

  return <Bed className={className} size={size} strokeWidth={strokeWidth} />;
};

export const RoomStatusIcon: React.FC<{ status?: string } & IconProps> = ({
  status,
  className = 'w-4 h-4',
  size,
  strokeWidth = 1.75
}) => {
  const normalizedStatus = (status || '').toUpperCase();

  switch (normalizedStatus) {
    case 'CLEAN':
      return <Sparkles className={className} size={size} strokeWidth={strokeWidth} />;
    case 'DIRTY':
      return <Wrench className={className} size={size} strokeWidth={strokeWidth} />;
    case 'IN_USE':
      return <UserCheck className={className} size={size} strokeWidth={strokeWidth} />;
    case 'MAINTENANCE':
      return <Wrench className={className} size={size} strokeWidth={strokeWidth} />;
    default:
      return <HelpCircle className={className} size={size} strokeWidth={strokeWidth} />;
  }
};
