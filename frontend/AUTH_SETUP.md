# Authentication & Landing Page Setup

## Overview

The SafeTrace X application now includes a complete authentication flow with:
- **Landing Page** - Beautiful homepage with interactive 3D globe
- **Login Page** - User authentication
- **Signup Page** - New user registration
- **Protected Routes** - Secure access to the mapping application

## Project Structure

```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── globe.tsx          # Interactive 3D globe component
│   │   ├── button.tsx         # Reusable button component
│   │   ├── input.tsx          # Form input component
│   │   └── card.tsx           # Card component for layouts
│   ├── Layout.tsx             # App layout with navigation
│   ├── Map.tsx                # Map component for routing
│   └── ProtectedRoute.tsx     # Route protection wrapper
├── pages/
│   ├── Landing.tsx            # Landing/home page with globe
│   ├── Login.tsx              # Login page
│   ├── Signup.tsx             # Registration page
│   ├── MapApp.tsx             # Main mapping application
│   └── Guardian.tsx           # Guardian dashboard
├── lib/
│   └── utils.ts               # Utility functions (cn helper)
└── App.tsx                    # Main app with routing
```

## Technologies Used

### UI Components & Styling
- **shadcn/ui principles** - Component architecture
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **cobe** - 3D globe visualization
- **lucide-react** - Beautiful icon library

### Key Libraries
```json
{
  "cobe": "^0.6.3",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.2.0",
  "class-variance-authority": "^0.7.0"
}
```

## Routes

| Path | Component | Protection | Description |
|------|-----------|------------|-------------|
| `/` | Landing | Public | Homepage with globe and features |
| `/login` | Login | Public | User login |
| `/signup` | Signup | Public | User registration |
| `/app` | MapApp | Protected | Main mapping application |
| `/guardian/:token` | Guardian | Public | Guardian dashboard |

## Authentication Flow

### 1. User Journey
```
Landing Page (/) 
    ↓
Login/Signup (/login or /signup)
    ↓
Map Application (/app) [Protected]
```

### 2. Protection Mechanism
The `ProtectedRoute` component checks for authentication:
```typescript
const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
```

If not authenticated, users are redirected to `/login`.

### 3. Login Process
1. User enters email and password
2. Credentials are validated (currently simulated)
3. Auth state stored in localStorage:
   - `isAuthenticated`: 'true'
   - `userEmail`: user's email
4. Redirect to `/app`

### 4. Signup Process
1. User enters name, email, password, and confirmation
2. Password match validation
3. Account created (currently simulated)
4. Auth state stored
5. Redirect to `/app`

### 5. Logout
1. Click logout button in navigation
2. Clear localStorage
3. Redirect to `/login`

## Components

### Globe Component
Interactive 3D globe with markers showing SafeTrace X coverage:
- Auto-rotates
- Drag to rotate
- Smooth animations
- Configurable markers

```tsx
import { Globe } from '@/components/ui/globe'

<Globe className="top-0" />
```

### UI Components

#### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="lg">
  Click Me
</Button>
```

Variants: `default`, `outline`, `ghost`, `destructive`
Sizes: `default`, `sm`, `lg`

#### Input
```tsx
import { Input } from '@/components/ui/input'

<Input 
  type="email" 
  placeholder="you@example.com"
  className="pl-10"
/>
```

#### Card
```tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer here</CardFooter>
</Card>
```

## Styling System

### Path Aliases
TypeScript and Vite are configured to use `@/` for imports:
```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

### Utility Function
The `cn()` function from `lib/utils.ts` merges Tailwind classes:
```typescript
import { cn } from "@/lib/utils"

<div className={cn("base-class", conditionalClass && "active")} />
```

### Color Scheme
- **Primary**: Orange (600, 700, 800)
- **Background**: White, Gray (50-100)
- **Text**: Gray (600-900)

## Development

### Running the Application
```bash
# Install dependencies (if not already done)
cd frontend
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Adding New Protected Routes
```tsx
import ProtectedRoute from './components/ProtectedRoute'

<Route path="/new-route" element={
  <ProtectedRoute>
    <Layout>
      <YourComponent />
    </Layout>
  </ProtectedRoute>
} />
```

## Features

### Landing Page Features
- ✅ Interactive 3D globe visualization
- ✅ Feature showcase
- ✅ Benefits section
- ✅ Call-to-action sections
- ✅ Responsive design
- ✅ Modern gradient backgrounds
- ✅ Smooth animations

### Authentication Features
- ✅ Email/password login
- ✅ User registration
- ✅ Form validation
- ✅ Remember me option
- ✅ Social auth UI (Google, GitHub)
- ✅ Password confirmation
- ✅ Terms & conditions checkbox

### Security Features
- ✅ Protected routes
- ✅ Auth state management
- ✅ Automatic redirects
- ✅ Logout functionality

## Next Steps

### Backend Integration
Currently, authentication is simulated. To integrate with a real backend:

1. **Update Login**:
```typescript
// Replace simulated auth in Login.tsx
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
const data = await response.json()
localStorage.setItem('authToken', data.token)
```

2. **Update Signup**:
```typescript
// Replace simulated registration in Signup.tsx
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})
```

3. **Add Token Validation**:
```typescript
// In ProtectedRoute.tsx
const validateToken = async () => {
  const token = localStorage.getItem('authToken')
  const response = await fetch('/api/auth/validate', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return response.ok
}
```

### Enhancements
- [ ] Add forgot password flow
- [ ] Implement email verification
- [ ] Add 2FA support
- [ ] Social authentication integration
- [ ] User profile page
- [ ] Session timeout handling
- [ ] Refresh token mechanism

## Troubleshooting

### Build Errors
If you encounter path alias errors:
1. Ensure `tsconfig.json` has the path configuration
2. Ensure `vite.config.ts` has the resolve alias
3. Restart the dev server

### Globe Not Rendering
1. Check that `cobe` is installed
2. Verify canvas element is rendered
3. Check browser console for errors

### Authentication Not Working
1. Clear localStorage: `localStorage.clear()`
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check browser console for errors

## License
Part of the SafeTrace X system.
