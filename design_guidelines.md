# BrainBox Agent - Design Guidelines

## Design Approach
**Reference-Based Approach** drawing from modern AI chat interfaces (ChatGPT, Claude) combined with Linear's clean aesthetic and Notion's friendly accessibility. The design prioritizes conversational flow, clarity, and intuitive learning interactions.

## Core Design Principles
1. **Conversational Clarity**: Chat interface is the star - minimize chrome, maximize conversation space
2. **Learning-First**: Make teaching the AI feel rewarding and effortless
3. **Trust Through Transparency**: Clear indicators of AI confidence and learning state
4. **Responsive Intelligence**: Adapt layout seamlessly from mobile to desktop

---

## Typography

**Font Family**: Inter via Google Fonts (clean, highly legible for chat)
- Headings: Inter Semi-Bold (600)
- Body/Chat: Inter Regular (400)
- UI Elements: Inter Medium (500)

**Scale**:
- App Title: text-2xl (24px)
- Chat Messages: text-base (16px)
- UI Labels/Buttons: text-sm (14px)
- Timestamps: text-xs (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing: p-2, gap-2
- Standard spacing: p-4, m-4, gap-4
- Section spacing: p-8, py-12
- Large gaps: gap-16

**Container Strategy**:
- Main chat area: max-w-3xl mx-auto (optimal reading width for conversations)
- Full-width header/footer with inner max-w-5xl
- Message bubbles: max-w-2xl with natural expansion

**Grid System**:
- Single-column chat layout (mobile-first)
- Desktop: Potential sidebar for knowledge stats (optional future feature)

---

## Component Library

### Header
- **Structure**: Sticky top bar with app branding and knowledge counter
- **Elements**: 
  - "🧠 BrainBox Agent" with brain emoji + title (left)
  - Knowledge count badge: "Learning: 47 topics" (right)
  - Subtle bottom border for separation
- **Height**: h-16
- **Padding**: px-4 py-3

### Chat Container
- **Layout**: Centered column with vertical scroll
- **Padding**: p-4 on mobile, p-8 on desktop
- **Height**: Remaining viewport after header (min-h-[calc(100vh-theme(spacing.16))])
- **Message Spacing**: gap-6 between message groups

### Message Bubbles
**User Messages**:
- Aligned right with ml-auto
- Rounded corners: rounded-2xl rounded-tr-sm (speech bubble tail)
- Padding: px-6 py-3
- Max-width: max-w-[85%] on mobile, max-w-lg on desktop

**AI Messages**:
- Aligned left with mr-auto
- Rounded corners: rounded-2xl rounded-tl-sm
- Padding: px-6 py-3
- Max-width: max-w-[85%] on mobile, max-w-lg on desktop
- Include avatar/icon: 32x32 brain emoji in circle (bg-gray-100, p-2, rounded-full)

**Special States**:
- Typing indicator: Three animated dots (8x8 each, gap-1)
- Uncertainty indicator: Small badge "Low Confidence" when weak match
- Learning success: Green checkmark with "Learned!" confirmation

### Action Buttons (Learning Features)

**Teach BrainBox Button**:
- Prominent button below AI "I don't know" message
- Size: px-6 py-3
- Icon: Plus or lightbulb icon
- Text: "Teach Me This"
- Full-width on mobile, inline on desktop

**Improve Answer Button**:
- Subtle button below AI response
- Size: px-4 py-2 (smaller than teach)
- Icon: Edit/pencil icon
- Text: "Improve This Answer"
- Appears on hover/tap

### Input Area
- **Structure**: Fixed bottom bar with input + send button
- **Layout**: Flex row with gap-3
- **Input Field**:
  - Rounded: rounded-full
  - Padding: px-6 py-4
  - Placeholder: "Ask me anything..."
  - Flex-grow to fill space
- **Send Button**:
  - Circular: w-12 h-12 rounded-full
  - Icon: Paper plane/arrow icon
  - Centered icon with flex items-center justify-center
- **Container Padding**: p-4
- **Shadow**: Subtle top shadow for depth

### Modal (Teaching/Improvement Dialog)
- **Backdrop**: Fixed overlay with backdrop-blur-sm
- **Content Card**:
  - Centered: max-w-md mx-auto mt-20
  - Rounded: rounded-3xl
  - Padding: p-8
  - Shadow: Large shadow for elevation
- **Elements**:
  - Title: text-xl font-semibold mb-4
  - Original question shown in gray box (p-4, rounded-xl, bg-gray-50)
  - Textarea for answer: h-32, rounded-xl, p-4
  - Button row: flex gap-3 mt-6 (Cancel + Save buttons)

### Empty State (Initial Load)
- **Structure**: Centered in chat area
- **Elements**:
  - Large brain icon (64x64)
  - Heading: "Hi! I'm BrainBox Agent"
  - Subtext: "Ask me anything. If I don't know, you can teach me!"
  - Example prompts as chips/pills (rounded-full, px-4 py-2, clickable)
- **Spacing**: gap-6 vertical stack

### Knowledge Counter Badge
- **Style**: Pill-shaped (rounded-full)
- **Padding**: px-4 py-1.5
- **Size**: text-sm
- **Icon**: Small dot indicator or number badge

---

## Animation Guidelines

**Use Sparingly - Purpose-Driven Only**:

1. **Typing Indicator**: Three-dot bounce animation (subtle, continuous during loading)
2. **Message Entry**: Gentle fade-in + slide-up (duration-300) for new messages
3. **Button Hover**: Subtle scale-105 transform (duration-200)
4. **Modal Entry**: Fade backdrop (duration-300) + scale content from 95 to 100
5. **Success Feedback**: Brief checkmark animation when knowledge saved (duration-500)

**NO animations on**: Scrolling, background elements, decorative components

---

## Responsive Breakpoints

**Mobile (default)**:
- Single column chat
- Full-width messages (max 85%)
- Stacked buttons
- Bottom input bar fixed

**Tablet (md: 768px+)**:
- Wider message bubbles (max-w-lg)
- Input area gains max-width constraint
- Modal slightly wider

**Desktop (lg: 1024px+)**:
- Chat container max-w-3xl centered
- Inline action buttons appear
- More generous padding (p-8 vs p-4)

---

## Images

**Header Icon**: Brain emoji (🧠) or simple brain icon SVG (32x32) next to "BrainBox Agent" title - serves as app identity

**Avatar Icons**: 
- AI messages: Small brain icon in circular container (32x32)
- User messages: Optional user initial or generic avatar (32x32)

**Empty State**: Large brain illustration or icon (64x64) centered when no conversation

**No hero images** - this is a chat application, not a landing page. Focus remains on the conversational interface.

---

## Key UX Patterns

1. **Progressive Disclosure**: Show "Improve Answer" only on message hover/long-press
2. **Immediate Feedback**: Typing indicator appears instantly on submit
3. **Clear Affordances**: All interactive elements have obvious clickable states
4. **Conversational Flow**: New messages auto-scroll into view
5. **Error Recovery**: Clear messaging when knowledge save fails
6. **Confidence Indicators**: Subtle badges showing AI certainty level

---

This design creates a trustworthy, learnable AI companion that feels modern, friendly, and intelligent while maintaining focus on the core interaction: conversation and knowledge sharing.