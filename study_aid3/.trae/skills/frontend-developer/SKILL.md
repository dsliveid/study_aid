---
name: "frontend-developer"
description: "Provides frontend development expertise including React, Vue, Angular, UI/UX implementation, performance optimization, and browser compatibility. Invoke when user needs help with frontend development, UI implementation, or frontend architecture."
---

# Frontend Developer

This skill provides comprehensive frontend development support for web applications, mobile web, and desktop applications.

## Core Capabilities

### Frontend Frameworks
- React (Hooks, Context, Redux, Next.js)
- Vue.js (Vue 3, Composition API, Vuex, Nuxt.js)
- Angular (Components, Services, RxJS, NgRx)
- Svelte and SvelteKit
- Modern JavaScript and TypeScript

### UI/UX Implementation
- Component-based architecture
- Responsive design and mobile-first approach
- CSS frameworks (Tailwind CSS, Bootstrap, Material-UI, Ant Design)
- CSS-in-JS solutions (Styled Components, Emotion)
- Accessibility (WCAG compliance)
- Animation and transitions (Framer Motion, GSAP)

### State Management
- React Context API and Hooks
- Redux Toolkit, Zustand, Jotai
- Vuex and Pinia (Vue)
- NgRx and Signals (Angular)
- Local storage and session management

### Performance Optimization
- Code splitting and lazy loading
- Bundle optimization (Webpack, Vite)
- Image optimization and lazy loading
- Memoization and virtualization
- Service Workers and caching strategies
- Performance monitoring and profiling

### Browser Compatibility
- Cross-browser testing and polyfills
- Progressive enhancement
- Feature detection
- IE/Edge legacy support
- Mobile browser optimization

### Build Tools & Tooling
- Webpack, Vite, Parcel
- Babel and TypeScript configuration
- ESLint, Prettier, and code formatting
- Testing frameworks (Jest, Vitest, Cypress, Playwright)
- CI/CD pipelines for frontend

## When to Use This Skill

Invoke this skill when the user:
- Needs help with frontend framework setup (React, Vue, Angular)
- Asks for UI component implementation
- Wants to optimize frontend performance
- Needs help with state management
- Asks about responsive design or mobile optimization
- Wants to implement animations or transitions
- Needs help with browser compatibility issues
- Asks about frontend testing strategies
- Wants to set up build tools and tooling
- Needs help with accessibility implementation
- Asks about frontend architecture patterns
- Wants to implement real-time features (WebSockets, SSE)
- Needs help with PWA (Progressive Web App)
- Asks about frontend security best practices

## Working Guidelines

1. **Component-First Approach**: Build reusable, composable components
2. **Performance First**: Always consider performance implications
3. **Accessibility**: Ensure WCAG 2.1 AA compliance
4. **Responsive Design**: Mobile-first, responsive breakpoints
5. **Type Safety**: Use TypeScript for type safety
6. **Testing**: Write tests for critical components
7. **Code Quality**: Follow linting and formatting rules
8. **Modern Standards**: Use modern JavaScript/TypeScript features

## Common Patterns

### React Patterns
- Custom Hooks for reusable logic
- Compound Components for complex UIs
- Render Props for flexible components
- Higher-Order Components (HOCs) for cross-cutting concerns
- Context API for global state

### Vue Patterns
- Composition API for reusable logic
- Provide/Inject for dependency injection
- Scoped Slots for flexible components
- Mixins (Vue 2) or Composables (Vue 3)

### Performance Patterns
- Memoization (React.memo, useMemo, useCallback)
- Virtual scrolling for long lists
- Code splitting with React.lazy and Suspense
- Image lazy loading and optimization
- Debouncing and throttling for events

## Best Practices

### Code Organization
- Feature-based folder structure
- Separate concerns (components, hooks, utils, types)
- Use absolute imports
- Keep components small and focused
- Use barrel files for clean imports

### State Management
- Keep state as close to where it's used
- Use local state when possible
- Lift state up only when necessary
- Consider server state vs client state
- Use appropriate state management solution

### Styling
- Use design tokens for consistency
- Prefer utility-first CSS (Tailwind)
- Use CSS modules or styled-components for component isolation
- Avoid inline styles
- Use CSS variables for theming

### Performance
- Measure before optimizing
- Use React DevTools Profiler
- Implement code splitting
- Optimize images and assets
- Use Web Workers for heavy computations
- Implement service workers for caching

## Testing Strategies

### Unit Testing
- Test components in isolation
- Mock external dependencies
- Test user interactions
- Test edge cases

### Integration Testing
- Test component interactions
- Test state management
- Test API integrations
- Test routing

### E2E Testing
- Test critical user flows
- Test cross-browser compatibility
- Test mobile responsiveness
- Test accessibility

## Output Formats

This skill can help create:
- React/Vue/Angular components
- Page layouts and templates
- Custom hooks and composables
- State management implementations
- Performance optimization strategies
- Testing configurations and test cases
- Build tool configurations (Webpack, Vite)
- CI/CD pipeline configurations
- Accessibility audit reports
- Performance optimization reports

## Common Libraries & Tools

### React Ecosystem
- UI Libraries: Ant Design, Material-UI, Chakra UI, shadcn/ui
- State: Redux Toolkit, Zustand, Jotai, TanStack Query
- Routing: React Router, Next.js App Router
- Forms: React Hook Form, Formik
- Data Fetching: Axios, Fetch API, TanStack Query
- Testing: Jest, React Testing Library, Cypress, Playwright

### Vue Ecosystem
- UI Libraries: Element Plus, Vuetify, PrimeVue
- State: Pinia, Vuex
- Routing: Vue Router
- Forms: VeeValidate, FormKit
- Data Fetching: Axios, VueUse
- Testing: Vitest, Vue Test Utils, Cypress

### Build Tools
- Bundlers: Vite, Webpack, Parcel, esbuild
- CSS: Tailwind CSS, PostCSS, Sass
- Code Quality: ESLint, Prettier, Stylelint
- Type Checking: TypeScript, Babel
- Package Managers: npm, yarn, pnpm

## Security Best Practices

- Sanitize user inputs
- Implement CSRF protection
- Use Content Security Policy (CSP)
- Secure cookies and local storage
- Prevent XSS attacks
- Implement proper authentication flows
- Use HTTPS in production
- Validate and sanitize data from APIs
