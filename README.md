# RiskTrace Frontend

> Modern Angular 18 Security Operations Center (SOC) Dashboard integrated with Spring Boot backend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend running on `http://localhost:8080`

### Installation & Run
```bash
npm install
npm start
```

Access the application at: **http://localhost:4200**

## 📋 Features

### ✅ Implemented & Integrated
- **Authentication System**
  - Login with email/password
  - Registration for new users
  - JWT token management
  - Protected routes
  - Auto-logout on session expiry
  - Return URL support

- **User Interface**
  - Modern glassmorphism design
  - Dark theme with accent colors
  - Responsive layout
  - Smooth animations
  - Premium gradients

- **Dashboard**
  - Key Performance Indicators (KPIs)
  - Risky entities monitoring
  - Real-time ML engine status
  - Quick navigation

- **Site Management**
  - View all registered sites
  - Create new sites
  - Regenerate API keys
  - Copy tracking script
  - Site status monitoring

- **Team Management**
  - View all users
  - Update user roles (ADMIN/ANALYST)
  - Enable/disable users
  - User status indicators

- **Security Features**
  - JWT authentication
  - HTTP interceptor for automatic token injection
  - Route guards for protected pages
  - Secure API communication

## 🏗️ Architecture

### Project Structure
```
src/
├── app/
│   ├── components/       # Reusable UI components
│   │   ├── sidebar/     # Navigation sidebar
│   │   └── topbar/      # Top navigation bar with user menu
│   ├── guards/          # Route protection
│   │   └── auth.guard.ts
│   ├── interceptors/    # HTTP interceptors
│   │   └── jwt.interceptor.ts
│   ├── layout/          # Page layouts
│   │   ├── auth-layout/      # For login/register
│   │   └── main-layout/      # For main app pages
│   ├── pages/           # Application pages
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── sites/
│   │   ├── team/
│   │   ├── logs/
│   │   ├── incidents/
│   │   ├── analytics/
│   │   ├── alerts/
│   │   ├── settings/
│   │   └── api-keys/
│   ├── services/        # Business logic & API calls
│   │   ├── auth.service.ts    # Authentication management
│   │   ├── api.service.ts     # Backend API communication
│   │   └── data.service.ts    # Mock data provider
│   └── app.routes.ts    # Route configuration
└── environments/        # Environment configurations
```

### Service Architecture

#### AuthService
Handles all authentication-related operations:
- Login/Logout/Register
- User session management
- Token storage and retrieval
- User role checking

#### ApiService
Manages HTTP communication with backend:
- Authentication endpoints
- Site management endpoints
- User management endpoints
- Automatic JWT token injection

#### DataService
Provides mock data for UI:
- Dashboard KPIs
- Analytics
- Can be extended for real backend data

## 🔐 Security Implementation

### Authentication Flow
```
1. User submits credentials → AuthService.login()
2. POST /api/auth/login → Backend validates
3. Backend returns { token, role, name, email }
4. Token stored in localStorage
5. User redirected to dashboard
6. All subsequent requests include JWT token via interceptor
```

### Route Protection
All routes except `/auth/login` are protected by `AuthGuard`:
- Checks for valid JWT token
- Redirects to login if unauthenticated
- Preserves return URL for post-login redirect

### HTTP Interceptor
Automatically:
- Adds `Authorization: Bearer {token}` header
- Handles 401 Unauthorized responses
- Triggers auto-logout on token expiry

## 🎨 Design System

### Color Palette
```css
--bg-dark: #0d1117
--bg-elevated: #161b22
--text-primary: #e6edf3
--text-secondary: #8d96a0
--accent-primary: #58a6ff
--accent-secondary: #a371f7
--border-color: #30363d
```

### Components
- Modern card-based layouts
- Glassmorphism effects
- Gradient backgrounds
- Smooth hover transitions
- Lucide icons
- Custom scrollbars

## 📡 API Integration

### Base URL
```typescript
// Development
apiUrl: 'http://localhost:8080/api'

// Production
apiUrl: 'https://your-domain.com/api'
```

### Endpoints Used

#### Authentication
```typescript
POST /api/auth/login
  Request: { email, password }
  Response: { token, role, name, email }

POST /api/auth/register
  Request: { name, email, password }
  Response: { token, role, name, email }
```

#### Sites Management
```typescript
GET /api/admin/sites
  Headers: Authorization: Bearer {token}
  Response: Site[]

POST /api/admin/sites
  Headers: Authorization: Bearer {token}
  Request: { name, domain }
  Response: Site

PUT /api/admin/sites/{id}/regenerate-key
  Headers: Authorization: Bearer {token}
  Response: Site
```

#### User Management
```typescript
GET /api/admin/users
  Headers: Authorization: Bearer {token}
  Response: User[]

PUT /api/admin/users/{id}/role
  Headers: Authorization: Bearer {token}
  Request: "ADMIN" | "ANALYST"
  Response: User

PUT /api/admin/users/{id}/toggle
  Headers: Authorization: Bearer {token}
  Response: User
```

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm start
# or
ng serve

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Adding New Features

#### 1. Create a New Page
```bash
ng generate component pages/new-page --standalone
```

#### 2. Add Route
```typescript
// app.routes.ts
{ path: 'new-page', component: NewPageComponent }
```

#### 3. Add API Endpoint
```typescript
// api.service.ts
getNewData(): Observable<any> {
  return this.http.get(`${this.apiUrl}/new-endpoint`, 
    { headers: this.getHeaders() });
}
```

#### 4. Use in Component
```typescript
// new-page.component.ts
this.apiService.getNewData().subscribe(data => {
  this.data = data;
});
```

## 📦 Dependencies

### Core
- **Angular 18** - Framework
- **RxJS** - Reactive programming
- **TypeScript** - Type safety

### UI
- **Lucide Icons** - Icon library
- **Native CSS** - Styling

### Build Tools
- **Angular CLI** - Development tooling
- **TypeScript Compiler** - Code compilation
- **Webpack** - Module bundling (via Angular CLI)

## 🐛 Troubleshooting

### CORS Errors
If you encounter CORS issues:

1. **Option 1**: Configure proxy (recommended for development)
   ```json
   // proxy.conf.json
   {
     "/api": {
       "target": "http://localhost:8080",
       "secure": false,
       "changeOrigin": true
     }
   }
   ```

2. **Option 2**: Backend CORS configuration (requires backend modification)

### 401 Unauthorized
- Check if token exists in localStorage
- Verify token hasn't expired (24h expiry)
- Ensure backend is running
- Check if user is logged in

### Connection Refused
- Verify backend is running on port 8080
- Check MongoDB connection
- Ensure correct API URL in `environment.ts`

### Component Not Loading
- Check browser console for errors
- Verify route configuration
- Ensure component is imported in routes
- Check AuthGuard configuration

## 🧪 Testing Integration

### Manual Testing

1. **Start Backend**
   ```bash
   cd ../RiskTraceBackend
   mvnw spring-boot:run
   ```

2. **Start Frontend**
   ```bash
   npm start
   ```

3. **Register User**
   - Navigate to http://localhost:4200
   - Click "Register"
   - Fill in: Name, Email, Password
   - Submit

4. **Login**
   - Enter credentials
   - Should redirect to dashboard

5. **Test Features**
   - View sites at `/sites`
   - Manage users at `/team`
   - Check dashboard at `/dashboard`
   - Logout from topbar

### Using cURL

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get Sites (replace TOKEN)
curl -X GET http://localhost:8080/api/admin/sites \
  -H "Authorization: Bearer TOKEN"
```

## 🚢 Deployment

### Build Production Bundle
```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Hosting
```bash
# Example: Deploy to Nginx
cp -r dist/risktrace-frontend/* /var/www/html/

# Example: Deploy to Firebase
firebase deploy

# Example: Deploy to Netlify
netlify deploy --prod --dir=dist/risktrace-frontend
```

### Environment Configuration
Update `src/environments/environment.prod.ts` with production API URL:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourproductiondomain.com/api'
};
```

## 📚 Further Resources

- [Angular Documentation](https://angular.dev)
- [RxJS Guide](https://rxjs.dev)
- [Lucide Icons](https://lucide.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 🤝 Support

For issues or questions:
1. Check `INTEGRATION_GUIDE.md` in parent directory
2. Review this README
3. Check browser console for errors
4. Verify backend is running and accessible

---

**Status**: ✅ Fully Integrated with Backend

This frontend is production-ready and fully integrated with the RiskTrace Spring Boot backend without requiring any backend modifications.
