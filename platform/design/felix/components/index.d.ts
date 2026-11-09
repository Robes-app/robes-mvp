import * as React from 'react';
export type IconName = 'home'|'lookbook'|'diary'|'wardrobe'|'capture'|'describe'|'edit'|'bell'|'close'|'check'|'chevron'|'back'|'plus'|'cloud'|'sun'|'rain'|'pin'|'forward'|'refresh'|'spring'|'summer'|'autumn'|'winter'|'tag'|'camera'|'search'|'receipt'|'calendar'|'star'|'bookmark'|'sparkle'|'heart'|'bag'|'grid'|'list'|'worn'|'pencil'|'link'|'inbox'|'photo';
export interface IconProps { name: IconName; size?: number; stroke?: number; label?: string; className?: string }
export interface WordmarkProps { children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export interface TopNavProps { variant?: 'mobile'|'desktop'; title?: string; swapMark?: boolean; swapAfter?: number; glass?: boolean; mark?: boolean; onBack?: () => void; onAdd?: () => void; addLabel?: string; noProfile?: boolean; initial?: string; bell?: boolean; alert?: boolean; links?: string[]; current?: string; weather?: { day: string; place: string; temp: string; icon?: 'cloud'|'sun'|'rain' }; onProfile?: () => void; onBell?: () => void; onNavigate?: (link: string) => void }
export type DockKey = 'home'|'lookbook'|'diary'|'wardrobe';
export interface DockBadge { count: number|string; tone?: 'ink'|'alert'; title?: string }
export interface DockProps { active?: DockKey; dots?: Partial<Record<DockKey, boolean>>; badges?: Partial<Record<DockKey, DockBadge|number>>; onSelect?: (key: string) => void }
export interface WeekDay { w?: string; n: number; today?: boolean; future?: boolean; worn?: boolean; looks?: number }
export interface WeekStripProps { days: WeekDay[]; selected?: number; onSelect?: (index: number) => void }
export interface ActionDiscProps { icon: IconName; label: string; title?: string; onClick?: () => void; className?: string }
export interface ButtonProps { variant?: 'primary'|'outline'|'chip'; children: React.ReactNode; icon?: IconName; block?: boolean; disabled?: boolean; type?: 'button'|'submit'; onClick?: () => void; className?: string }
export interface TabsProps { items: string[]; value: string; onChange?: (label: string) => void }
export interface Piece { img?: string; category: string; name: string; brand?: string; worn?: number; price?: string; wishlist?: boolean; shop?: boolean; meta?: string }
export interface PieceListProps { items: Piece[]; title?: string | null; view?: 'list'|'grid'; onView?: (v: 'list'|'grid') => void; editing?: boolean; onEditToggle?: () => void; /** @deprecated use editing */ mode?: 'view'|'edit'; swiped?: number; onOpen?: (i: number) => void; onSwap?: (i: number) => void; onRemove?: (i: number) => void; onAdd?: () => void }
export interface SheetAction { key?: string; icon: IconName; label: string; count?: number; onClick?: () => void }
/** @deprecated use SheetAction */
export interface SheetRow { icon: IconName; label: string; onClick?: () => void }
export interface SheetProps { title?: string; actions?: SheetAction[]; active?: string; onClose?: () => void; header?: React.ReactNode; headerAction?: React.ReactNode; children?: React.ReactNode; /** @deprecated use title */ question?: string; /** @deprecated use actions */ rows?: SheetRow[] }
export interface SavedLookProps { image?: string; images?: string[]; count?: number; alt?: string; adjustLabel?: string; onBack?: (() => void) | null; onAdjust?: (() => void) | null; onImages?: (() => void) | null; className?: string; style?: React.CSSProperties }
export interface DraftContext { place: string; weather?: 'cloud'|'sun'|'rain'; range?: string }
export interface DraftDetails { tags?: string[]; seasons?: Array<'Spring'|'Summer'|'Autumn'|'Winter'>; worn?: string; caption?: string }
export interface DraftLookProps { mode?: 'draft'|'edit'; title?: string; image?: string; images?: string[]; count?: number; alt?: string; adjustLabel?: string; pieces?: Piece[]; tab?: 'Pieces'|'Details'; context?: DraftContext | null; details?: DraftDetails; prompt?: string; placeholder?: string; generateLabel?: string; canSave?: boolean; canGenerate?: boolean; generating?: boolean; confirm?: boolean; children?: React.ReactNode; onClose?: () => void; onDone?: () => void; onAdjust?: (() => void) | null; onImages?: (() => void) | null; onTab?: (tab: string) => void; onAddPiece?: () => void; onSwap?: (i: number) => void; onRemove?: (i: number) => void; onRemoveContext?: (() => void) | null; onAddContext?: () => void; onPromptChange?: (text: string) => void; onGenerate?: (text: string) => void; onTags?: () => void; onSeasons?: () => void; onWorn?: () => void; onCaption?: () => void; onConfirmDiscard?: () => void; onKeepEditing?: () => void; managing?: boolean; onRemoveImage?: (i: number) => void; onAddPhoto?: () => void; onManageDone?: () => void; sheet?: 'adjust'|'describe'|'wardrobe'|'tags'|'seasons'|'worn'|null; onSheetClose?: () => void; onAdjustSend?: (text: string) => void; tagOptions?: TagOption[]; onTagToggle?: (i: number) => void; onTagDelete?: (i: number) => void; onTagAdd?: (text: string) => void; onSeasonsChange?: (v: Season[]) => void; wornDates?: WornDate[]; onWornRemove?: (i: number) => void; onWornAdd?: () => void; describeExpanded?: boolean; onDescribeExpand?: () => void; onDescribeCollapse?: () => void; onDescribeRemovePiece?: (i: number) => void; onDescribeSend?: (text: string) => void; wardrobe?: WardrobeItem[]; wardrobeCategory?: string; wardrobeQuery?: string; onWardrobeCategory?: (c: string) => void; onWardrobeQuery?: (q: string) => void; onWardrobeToggle?: (i: number) => void; onPhotograph?: () => void; onWardrobeConfirm?: () => void; captionEditing?: boolean; onCaptionChange?: (v: string) => void; onCaptionSave?: (v: string) => void; choose?: boolean; onUpdate?: () => void; onSaveNew?: () => void; onChooseCancel?: () => void; className?: string; style?: React.CSSProperties }
export type Season = 'Spring'|'Summer'|'Autumn'|'Winter';
export interface TagOption { t: string; on?: boolean }
export interface WornDate { date: string; note?: string }
export interface ImageManagerProps { images: string[]; removable?: boolean; onRemove?: (i: number) => void; onAddPhoto?: () => void; onDone?: () => void }
export interface AdjustSheetProps { title?: string; placeholder?: string; value?: string; sending?: boolean; onChange?: (v: string) => void; onSend?: (v: string) => void; onClose?: () => void }
export interface TagsViewProps { tags: TagOption[]; swiped?: number; onBack?: () => void; onToggle?: (i: number) => void; onDelete?: (i: number) => void; onAdd?: (text: string) => void }
export interface SeasonsViewProps { value: Season[]; onBack?: () => void; onChange?: (v: Season[]) => void }
export interface WornViewProps { dates: WornDate[]; onBack?: () => void; onRemove?: (i: number) => void; onAdd?: () => void }
export interface WardrobeItem { img: string; name: string; cat: string; on?: boolean }
export interface ModelOption { src: string; name: string; bs?: string; bp?: string }
export interface DescribeSheetProps { pieces?: Array<{ name: string; img?: string }>; expanded?: boolean; value?: string; canSend?: boolean; title?: string; placeholder?: string; onExpand?: () => void; onCollapse?: () => void; onRemovePiece?: (i: number) => void; onChange?: (v: string) => void; onSend?: (v: string) => void; onClose?: () => void }
export interface WardrobePickerProps { items: WardrobeItem[]; categories?: string[]; category?: string; query?: string; ready?: boolean; ctaLabel?: string; onCategory?: (c: string) => void; onQuery?: (q: string) => void; onToggle?: (i: number) => void; onPhotograph?: () => void; onConfirm?: () => void; onBack?: () => void }
export interface ModelPickerProps { models: ModelOption[]; value?: number; title?: string; onPick?: (i: number) => void; onOwn?: () => void; onClose?: () => void }
export interface ModelStackProps { model: ModelOption; onClick?: () => void }
export interface Alert { text: string; dest: string; icon?: 'receipt'|'calendar'; onOpen?: () => void; onDismiss?: () => void }
export interface NotificationsSheetProps { alerts: Alert[]; title?: string; emptyText?: string; onClose?: () => void; onDone?: () => void }
export interface SettingsRow { label: string; value?: string; muted?: boolean }
export interface SettingsViewProps { tab?: 'style'|'account'; title?: string; rows?: { style?: Array<string|SettingsRow>; account?: Array<string|SettingsRow> }; onTab?: (t: 'style'|'account') => void; onRow?: (label: string) => void; onSignOut?: (() => void) | null; onBack?: () => void }
export interface DialogAction { label: string; variant?: 'primary'|'outline'|'text'; onClick?: () => void }
export interface AlertDialogProps { title: string; message?: string; actions: DialogAction[]; onDismiss?: () => void }
export interface LookDetailsProps { tags?: string[]; seasons?: Season[]; worn?: string; caption?: string; captionEditing?: boolean; captionDraft?: string; autoFocus?: boolean; onTags?: () => void; onSeasons?: () => void; onWorn?: () => void; onCaption?: () => void; onCaptionChange?: (v: string) => void; onCaptionSave?: (v: string) => void }
export interface PieceDetails { category?: string[]; colour?: { name: string; hex?: string }; material?: string; seasons?: Season[]; occasions?: string[]; worn?: string; note?: string }
export interface PieceLook { img: string; title: string }
export interface WardrobePieceProps { image: string; images?: string[]; count?: number; name: string; tab?: 'Piece'|'Colour'|'Wearing'; shop?: boolean;
  piece?: { category?: string; brand?: string; shop?: string; size?: string; price?: string; notes?: string };
  colour?: { colour?: { name: string; hex?: string }; additional?: string[]; print?: { name: string; swatch?: string }; material?: string[] };
  wearing?: { worn?: string; looks?: number; seasons?: Season[]; occasions?: string[] };
  onBack?: () => void; onAdjust?: () => void; onImages?: () => void; onTab?: (t: string) => void; onField?: (label: string) => void; onDelete?: () => void; onAddToWardrobe?: () => void }
export interface FilterChipProps { label: string; count?: number; icon?: IconName; selected?: boolean; disabled?: boolean; title?: string; onClick?: () => void; className?: string }
export interface CollectionSegment { key?: string; label: string; icon?: IconName }
export interface CollectionFilter { key?: string; label: string; count?: number }
export interface CollectionBarProps { segments: CollectionSegment[]; value: string; onChange?: (key: string) => void; onAdd?: () => void; addLabel?: string; filters?: CollectionFilter[]; filter?: string; onFilter?: (key: string) => void; search?: { placeholder?: string; value?: string; onChange?: (q: string) => void }; view?: 'grid'|'list'; onView?: (v: 'grid'|'list') => void; sticky?: boolean }
export interface LookCardProps { image?: string; name: string; occasion?: string; worn?: number; isNew?: boolean; wishlist?: boolean; shop?: boolean; /** @deprecated use shop */ store?: boolean; suggested?: boolean; saved?: boolean; onSave?: () => void; onOpen?: () => void }
export interface PieceTileProps { image?: string; name: string; worn?: number; meta?: string; wished?: boolean; onWish?: () => void; onOpen?: () => void }
export interface EmptyStateProps { icon?: IconName; title: string; message?: string; action?: string; onAction?: () => void }
export interface PageDotsProps { count: number; value?: number; label?: string }
export declare const Icon: React.FC<IconProps>;
export declare const Wordmark: React.FC<WordmarkProps>;
export declare const TopNav: React.FC<TopNavProps>;
export declare const Dock: React.FC<DockProps>;
export declare const WeekStrip: React.FC<WeekStripProps>;
export declare const ActionDisc: React.FC<ActionDiscProps>;
export declare const Button: React.FC<ButtonProps>;
export declare const Tabs: React.FC<TabsProps>;
export declare const PieceList: React.FC<PieceListProps>;
export declare const Sheet: React.FC<SheetProps>;
export declare const SavedLook: React.FC<SavedLookProps>;
export declare const DraftLook: React.FC<DraftLookProps>;
export declare const ImageManager: React.FC<ImageManagerProps>;
export declare const AdjustSheet: React.FC<AdjustSheetProps>;
export declare const TagsView: React.FC<TagsViewProps>;
export declare const SeasonsView: React.FC<SeasonsViewProps>;
export declare const WornView: React.FC<WornViewProps>;
export declare const DescribeSheet: React.FC<DescribeSheetProps>;
export declare const WardrobePicker: React.FC<WardrobePickerProps>;
export declare const ModelPicker: React.FC<ModelPickerProps>;
export declare const ModelStack: React.FC<ModelStackProps>;
export declare const NotificationsSheet: React.FC<NotificationsSheetProps>;
export declare const SettingsView: React.FC<SettingsViewProps>;
export declare const AlertDialog: React.FC<AlertDialogProps>;
export declare const LookDetails: React.FC<LookDetailsProps>;
export declare const WardrobePiece: React.FC<WardrobePieceProps>;
export declare const FilterChip: React.FC<FilterChipProps>;
export declare const CollectionBar: React.FC<CollectionBarProps>;
export declare const LookCard: React.FC<LookCardProps>;
export declare const PieceTile: React.FC<PieceTileProps>;
export declare const EmptyState: React.FC<EmptyStateProps>;
export declare const PageDots: React.FC<PageDotsProps>;
