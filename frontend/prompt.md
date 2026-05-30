# Redesign Request: Premium ATS Analyzer UI

## Project Overview
This is a Next.js (App Router) based ATS Score Analyzer. The current UI is a clean, Apple-inspired design, but we want to take it to the next level—making it feel **Premium, State-of-the-Art, and Visual-First**.

## Core Objective
Redesign the frontend to be "wows" at first glance. Think high-end SaaS dashboards (like Linear, Raycast, or Vercel) combined with modern interactive elements.

## Design Aesthetics Requirements
1. **Rich Aesthetics**: Use vibrant, curated color palettes (e.g., Indigo, Deep Violet, and Electric Blue).
2. **Glassmorphism**: Extensive use of backdrop-blur (30px+), subtle borders, and soft shadows to create depth.
3. **Typography**: Use a modern sans-serif font (Inter or Outfit). Ensure bold, readable headings with proper spacing.
4. **Dynamic Backgrounds**: Implement mesh gradients or animated blobs that subtly move in the background.
5. **Micro-Animations**: Every interaction (hover, click, state change) should have a `framer-motion` spring or transition.
6. **Bento Box Layout**: Use a modern grid-based layout for the features and "How it Works" sections.

## Specific UI Tasks

### 1. Landing Page (Hero)
- Create a more immersive hero section with a dynamic background.
- Use a "Split Hero" or "Centered Impact" layout.
- Add a floating "preview" of an ATS report to build trust.

### 2. The Upload Flow (`src/components/UploadSection.tsx`)
- Transform the upload section into a multi-step interactive wizard.
- **Step 1 (Domain Selection)**: Use a grid of cards with unique icons and subtle hover effects.
- **Step 2 (Data Entry)**: Use floating labels and sleek input fields.
- **Step 3 (File Upload)**: Implement a high-quality drag-and-drop area with a "processing" animation that looks like a real scan (scanning lines, glowing edges).
- **Results View**: Instead of a simple card, create a mini-dashboard with:
    - A radial gauge for the score.
    - Categories (Keywords, Formatting, Impact) with status badges.
    - Expandable "Suggestion" cards with clear action items.

### 3. Global Styling (`src/app/globals.css`)
- Update variables for a more vibrant palette.
- Add utility classes for "glow" effects and "glass" variations.

## Implementation Guidelines
- **Framework**: Continue using Next.js (App Router), Tailwind CSS, and Framer Motion.
- **Icons**: Use `lucide-react`.
- **Backend Integration**: Keep the existing `fetch` logic to `http://localhost:5000/api/upload`.
- **Responsive**: Ensure it looks stunning on both Desktop and Mobile.

## Steps for Claude Code:
1.  **Analyze** the current `page.tsx` and `UploadSection.tsx`.
2.  **Refine** `globals.css` to include a more robust design system (colors, shadows, glass effects).
3.  **Rebuild** the `UploadSection` with a focus on "experience" rather than just "functionality".
4.  **Enhance** the `Home` page with better layouts and visual assets.

**Let's build something that looks like it belongs in 2026!**
