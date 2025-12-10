# ActNow AI Assistant - Project Description

## Overview
ActNow AI Assistant is an intelligent conversational AI interface that provides real-time assistance through a floating chat widget. The application features a modern glassmorphism design with a neutral color palette and supports multiple AI models through OpenRouter API integration.

## UI Design Philosophy

### Visual Style
- **Design System**: Glassmorphism with soft card aesthetics
- **Color Palette**: Neutral tones (slate/gray scale) with subtle gradients
- **Typography**: Inter font family, clean and modern
- **Effects**: Backdrop blur, soft shadows, smooth transitions
- **Theme Support**: Light and Dark modes with auto-detection

### Layout Components
The interface consists of several key visual elements arranged in a compact, non-intrusive layout.

## Main UI Components

### 1. Floating Chat Button
- **Appearance**: Circular glassmorphic button with lightning bolt icon (⚡)
- **Position**: Fixed on the right edge of the screen, vertically centered
- **Size**: 56x56 pixels
- **Effects**: 
  - Soft pulse animation
  - Hover scale effect (1.1x)
  - Glass background with blur
  - Drop shadow with glow
- **Functionality**: Toggle chat widget visibility

### 2. Chat Container
- **Dimensions**: 400x650px (default), resizable from 340x450 to 90vw x 95vh
- **Position**: Fixed, appears to the left of the floating button
- **Design**: Rounded corners (32px radius), glassmorphic card with backdrop blur
- **Structure**:
  - Header section
  - Message display area
  - Input area
  - Footer with metadata

### 3. Header Section
- **Background**: Solid white (light mode) with subtle shadow
- **Elements**:
  - **Sidebar Toggle**: Hamburger menu icon (left)
  - **Bot Avatar**: 40x40px rounded square with lightning icon and online status dot
  - **Title**: "ActNow AI" with subtitle "Ready to assist"
  - **Action Buttons**: Settings and Close icons
- **Height**: ~68px with padding

### 4. Conversation Sidebar (Collapsible)
- **Width**: 260px
- **Position**: Slides in from left, overlays main chat
- **Features**:
  - "New Chat" button with plus icon
  - Scrollable conversation list
  - Each item shows:
    - Conversation title (truncated)
    - Timestamp
    - Website origin
    - Delete button (appears on hover)
  - Active conversation highlighted
- **Sorting**: Newest created first (by creation timestamp)

### 5. Messages Area
- **Layout**: Vertical scrolling list with auto-scroll to latest
- **Styling**:
  - Minimal spacing between messages (compact list style)
  - User messages: Right-aligned, neutral gray background
  - AI messages: Left-aligned, transparent background
- **Message Structure**:
  - Avatar + Timestamp row (above content)
  - Message content bubble
  - Compact design with subtle shadows

#### Message Types

**User Messages**:
- Background: Light neutral gray (var(--neutral-100))
- Border: 1px solid neutral-200
- Border radius: 12px with slight distinction (4px top-right)
- Text color: Primary dark

**Assistant Messages**:
- Background: Transparent
- No border
- Content: Markdown-rendered with syntax highlighting
- Streaming indicator: Blinking cursor during response generation

**Welcome Screen**:
- Centered layout with wave emoji icon
- Welcome title and description
- Three suggested action chips: "Summarize", "Explain", "Write"

### 6. Custom Chips Bar
- **Position**: Above input area, horizontal scrolling
- **Appearance**: Pill-shaped buttons with glassmorphic style
- **Behavior**: 
  - Click to insert prompt into input
  - Auto-sends message
  - Hover effects: lift and shadow
- **Customization**: Users can add/edit/delete chips in settings

### 7. Context Preview (Selected Text)
- **Visibility**: Appears when user selects text on page
- **Display**: Shows "Selected: [first 2 words]..."
- **Position**: Above input field, below chips
- **Action**: Close button to clear selection
- **Integration**: Selected text is included with message as context

### 8. Input Area
- **Design**: Glassmorphic rounded rectangle (32px radius)
- **Components**:
  - Multi-line textarea (auto-expanding, max 120px)
  - Send button (circular, gradient background)
- **States**:
  - Default: Transparent with subtle border
  - Focus: Enhanced border, lift effect, outer glow
  - Disabled: Grayed out when API key missing

### 9. Input Footer
- **Layout**: Horizontal row below input
- **Left Side**: Model selector dropdown
- **Right Side**: Token counter (e.g., "🪙 ~150 tokens")

#### Model Selector
- **Type**: Custom searchable dropdown (opens upward)
- **Trigger**: Compact button showing selected model
- **Menu Features**:
  - Search input with icon
  - Scrollable model list (max 240px height)
  - Each model shows:
    - Provider and name
    - Pricing (input/output per token)
  - Selected model highlighted
- **Models Loaded**: Dynamically from OpenRouter API

### 10. Resize Handles
- **Positions**: 8 handles (corners and edges: N, S, E, W, NE, NW, SE, SW)
- **Visibility**: Semi-transparent, subtle
- **SE Handle**: Most prominent with gradient indicator
- **Functionality**: Drag to resize chat container

## Advanced Features

### Markdown & Code Rendering
- **Formatting Support**:
  - Headers (H1-H6)
  - Bold, italic, bold+italic
  - Lists (unordered)
  - Links (open in new tab)
  - Inline code with syntax highlighting
  - Code blocks with language detection

#### Code Blocks
- **Design**: Dark slate background (GitHub-style)
- **Header**: Language label + Copy button
- **Syntax Highlighting**: Dracula-inspired color scheme
  - Keywords: Pink
  - Strings: Yellow
  - Comments: Gray italic
  - Numbers: Purple
  - Functions: Green
- **Copy Button**: One-click code copying with "Copied!" feedback

### Streaming Response
- **Behavior**: AI responses appear token-by-token in real-time
- **Indicator**: Blinking cursor at end of streaming text
- **Initial State**: Loading dots animation before first token
- **Performance**: Smooth updates without re-rendering entire message

### Message Queue System
- **Capacity**: Up to 5 messages
- **Visual**: Queued messages shown with faded style and "⏳ Waiting in queue..." status
- **Control**: "Stop & Clear Queue" button appears when queue is active
- **Prevention**: Alert if user tries to exceed queue limit

### Conversation Management
- **Isolation**: Each browser tab maintains its own active conversation
- **Persistence**: Conversations saved to local storage
- **History**: Shared across tabs (visible in sidebar)
- **Switching**: Click any conversation in sidebar to load it
- **Deletion**: Confirm dialog before removing conversation
- **Titles**: Auto-generated from first user message (30 chars max)

### Text Selection Integration
- **Detection**: Automatically captures text selected on webpage
- **Display**: Preview shows selected excerpt in context bar
- **Usage**: Selection is sent as context with user's question
- **Format**: `Context: """[selected text]"""\n\nQuestion: [user input]`

## Settings Page

### Layout
- **Design**: Full-page with centered card layout (max-width 640px)
- **Background**: Gradient with decorative blur orbs
- **Header**: Logo (⚡), title, subtitle
- **Statistics Cards**: 3-column grid showing Messages, Chats, Storage usage

### Configuration Sections

#### 1. API Configuration Card
- **API Key Input**: Password field with link to OpenRouter
- **Test Button**: Validates key and shows status
- **Refresh Models Button**: Reloads available models
- **Status Indicator**: Colored dot (green=valid, red=invalid, gray=not set)
- **Model Selector**: Dropdown grouped by provider
- **Max Tokens**: Number input (100-4000)
- **Creativity Slider**: Range 0-1 for temperature setting

#### 2. Custom Chips Card
- **Chip List**: Visual display of all custom chips
- **Chip Items**: Show label, edit/delete buttons
- **Add Form**: Inputs for label and prompt
- **Edit Mode**: Form switches to update mode when editing
- **Defaults**: Pre-populated with Summarize, Explain, Fix Grammar

#### 3. Preferences Card
- **Enable Toggle**: Master switch for application
- **Theme Selector**: Light/Dark/Auto
- **Auto-open**: Toggle to open chat on page load
- **Sound Notifications**: Toggle audio alerts

#### 4. Data Management Card
- **Export**: Download JSON backup of all data
- **Import**: Restore from JSON file
- **Clear All**: Delete all conversations (with confirmation)

#### 5. About Card
- **Version Display**: Shows current version from manifest
- **Links**: GitHub, Support email, Documentation

### Form Controls
- **Text Inputs**: Rounded, bordered, focus glow effect
- **Toggles**: iOS-style switches with gradient when active
- **Range Slider**: Gradient thumb with live value display
- **Buttons**: Three styles (primary gradient, secondary white, danger red)
- **Messages**: Success (green) and error (red) banners with auto-hide

## Color System

### Light Theme
- Neutral palette: Slate 100-800
- Glass effects: White with 70-90% opacity
- Shadows: Soft slate with low opacity
- Accents: Slate 500-600 gradients

### Dark Theme
- Darker slate backgrounds
- Purple-tinged neutrals for warmth
- Glass effects: Dark slate with 60-85% opacity
- Reduced shadow intensity

## Animations

### Transitions
- **Duration**: 0.2-0.4s for UI interactions
- **Easing**: Cubic bezier curves for natural motion
- **Effects**:
  - Slide-in: Sidebar and dropdowns
  - Float-in: Chat container on open
  - Scale: Button hovers (1.1x)
  - Lift: Input focus (translateY -2px)

### Loading States
- **Pulse**: Chat button continuous soft pulse
- **Dots**: Three-dot bounce animation for typing
- **Cursor**: Blink animation for streaming
- **Spin**: Rotating icon for loading buttons

## Responsive Design

### Mobile Adaptations (< 480px)
- Chat container: 100vw - 80px width
- Header: Reduced padding
- Messages: Smaller avatars and fonts
- Input: Compact padding
- Stats: Single column layout

### Constraints
- **Min Size**: 340x450px
- **Max Size**: 90vw x 95vh
- **Default**: 400x650px

## Accessibility Features

- **Focus Indicators**: 2px outline on all interactive elements
- **ARIA Labels**: Proper roles and expanded states
- **Keyboard Navigation**: Full keyboard support
- **Tab Order**: Logical focus flow
- **Color Contrast**: WCAG AA compliant
- **Screen Reader**: Semantic HTML structure

## Technical Integration

### Storage
- **Sync Storage**: API key, model, theme, preferences, custom chips
- **Local Storage**: Conversations, messages, history
- **Session Storage**: Active conversation ID per tab

### API Communication
- **Provider**: OpenRouter.ai
- **Endpoint**: `/chat/completions`
- **Method**: Streaming SSE (Server-Sent Events)
- **Headers**: Authorization, HTTP-Referer, X-Title
- **Models**: Dynamically loaded from `/models` endpoint

### Performance
- **Shadow DOM**: Isolated styles, no conflicts with host page
- **Debouncing**: Input handlers optimized
- **Lazy Rendering**: Only visible messages rendered
- **Stream Buffering**: Efficient token accumulation

## User Workflows

### First-Time Setup
1. Install application
2. Open settings page automatically
3. Enter OpenRouter API key
4. Test key and load models
5. Select preferred model
6. Close settings, chat button appears on pages

### Starting a Conversation
1. Click floating chat button
2. Widget slides in from right
3. See welcome screen with suggested chips
4. Type message or click chip
5. Press Enter or click send
6. Watch AI response stream in real-time

### Using Context Selection
1. Select text on webpage
2. Context preview appears in chat
3. Type question about selected text
4. Send message with context included
5. Clear context or send again

### Managing Conversations
1. Click hamburger menu to open sidebar
2. View all past conversations
3. Click "New Chat" to start fresh
4. Click conversation to switch
5. Hover and delete unwanted chats

### Customizing Chips
1. Open settings page
2. Scroll to Custom Chips section
3. Enter label and prompt
4. Click "Add Chip"
5. Chip appears in chat input footer
6. Edit or delete as needed

## Error Handling

- **Missing API Key**: Alert prompts user to configure
- **Invalid Model**: Alert to select model
- **Network Errors**: Display error message in chat
- **Stream Interruption**: Shows partial response with error
- **Storage Quota**: Warning if limit approached
- **Context Invalidation**: Graceful recovery on reload

## Security & Privacy

- **API Key Storage**: Encrypted in browser sync storage
- **Local Processing**: All data stays in browser
- **No External Tracking**: No analytics or telemetry
- **Secure Communications**: HTTPS only for API calls
- **XSS Prevention**: HTML escaping in markdown parser
- **Content Security**: Shadow DOM isolation
