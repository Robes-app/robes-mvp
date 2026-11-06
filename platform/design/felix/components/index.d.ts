import * as React from 'react';
export type IconName = 'home'|'lookbook'|'diary'|'wardrobe'|'capture'|'describe'|'edit'|'bell'|'close'|'check'|'chevron'|'back'|'plus'|'cloud'|'sun'|'rain'|'pin'|'forward'|'refresh'|'spring'|'summer'|'autumn'|'winter'|'tag'|'camera'|'search'|'receipt'|'calendar'|'star';
export interface IconProps { name: IconName; size?: number; stroke?: number; label?: string; className?: string }
export interface WordmarkProps { children?: React.ReactNode; className?: string; style?: React.CSSProperties }
export interface TopNavProps { variant?: 'mobile'|'desktop'; initial?: string; bell?: boolean; alert?: boolean; links?: string[]; current?: string; weather?: { day: string; place: string; temp: string; icon?: 'cloud'|'sun'|'rain' }; onProfile?: () => void; onBell?: () => void; onNavigate?: (link: string) => void }
export interface DockProps { active?: 'home'|'lookbook'|'diary'|'wardrobe'; dots?: Partial<Record<'home'|'lookbook'|'diary'|'wardrobe', boolean>>; onSelect?: (key: string) => void }
export interface WeekDay { w?: string; n: number; today?: boolean; future?: boolean; worn?: boolean; looks?: number }
export interface WeekStripProps { days: WeekDay[]; selected?: number; onSelect?: (index: number) => void }
export interface ActionDiscProps { icon: IconName; label: string; title?: string; onClick?: () => void; className?: string }
export interface ButtonProps { variant?: 'primary'|'outline'|'chip'; children: React.ReactNode; icon?: IconName; block?: boolean; disabled?: boolean; type?: 'button'|'submit'; onClick?: () => void; className?: string }
export interface TabsProps { items: string[]; value: string; onChange?: (label: string) => void }
export interface Piece { img?: string; category: string; brand?: string; name: string; meta?: string }
export interface PieceListProps { items: Piece[]; mode?: 'view'|'edit'; onSwap?: (i: number) => void; onRemove?: (i: number) => void; onAdd?: () => void }
export interface SheetRow { icon: IconName; label: string; onClick?: () => void }
export interface SheetProps { eyebrow?: string; question?: string; rows?: SheetRow[]; floating?: boolean; children?: React.ReactNode }
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
export interface WardrobePieceProps { image: string; images?: string[]; count?: number; category: string; name: string; brand?: string; favourite?: boolean; tab?: 'Details'|'Looks'; details?: PieceDetails; looks?: PieceLook[]; onBack?: (() => void) | null; onImages?: (() => void) | null; onEdit?: () => void; onFavourite?: () => void; onTab?: (t: string) => void; onCategory?: () => void; onColour?: () => void; onMaterial?: () => void; onSeasons?: () => void; onOccasions?: () => void; onWorn?: () => void; onNote?: () => void; onLook?: (i: number) => void }
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
