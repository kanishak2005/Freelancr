# Freelancr Environment Variables Baseline

> **Generated:** Baseline Capture for PRD 01  
> **Rule:** Record environment variable names, descriptions, required status, and defaults only. Never record secret or credential values.

---

## 1. Server Environment Variables (`server/.env`)

Loaded via `dotenv` and validated in `server/src/config/env.ts`.

| Variable Name | Required? | Default / Fallback | Type | Consuming Service | Description / Purpose |
|---|---|---|---|---|---|
| `PORT` | Optional | `5000` | Number | Server entry (`server.ts`) | Port number for Express HTTP and Socket.IO server |
| `NODE_ENV` | Optional | `"development"` | String | Express / App | Runtime environment (`development`, `production`, `test`) |
| `MONGODB_URI` | **Required** | None | String | Mongoose (`connectDB.ts`) | MongoDB database connection URI string |
| `JWT_ACCESS_SECRET` | **Required** | None | String | JWT Auth (`utils/jwt.ts`) | Secret key used to sign and verify short-lived access tokens |
| `JWT_REFRESH_SECRET` | **Required** | None | String | JWT Auth (`utils/jwt.ts`) | Secret key used to sign and verify refresh tokens stored in cookies |
| `CLIENT_URL` | Optional | `"http://localhost:5173"` | String | CORS / Email / Sockets | Frontend origin URL for CORS whitelisting and reset password links |
| `RAZORPAY_KEY_ID` | **Required** | None | String | Razorpay (`config/razorpay.ts`) | Razorpay API key identifier for order creation and verification |
| `RAZORPAY_KEY_SECRET` | **Required** | None | String | Razorpay (`config/razorpay.ts`) | Razorpay API key secret used for payment fetch and signature HMAC |
| `RAZORPAY_WEBHOOK_SECRET` | **Required** | None | String | Razorpay (`payment.service.ts`)| Secret key used to compute and verify Razorpay webhook signatures |
| `CLOUDINARY_CLOUD_NAME` | Optional | `""` | String | Cloudinary (`config/cloudinary.ts`) | Cloudinary cloud account name |
| `CLOUDINARY_API_KEY` | Optional | `""` | String | Cloudinary (`config/cloudinary.ts`) | Cloudinary API access key |
| `CLOUDINARY_API_SECRET` | Optional | `""` | String | Cloudinary (`config/cloudinary.ts`) | Cloudinary API access secret |
| `MAIL_HOST` | Optional | `""` | String | Nodemailer (`config/mail.ts`) | SMTP server hostname |
| `MAIL_PORT` | Optional | `587` | Number | Nodemailer (`config/mail.ts`) | SMTP server port |
| `MAIL_USER` | Optional | `""` | String | Nodemailer (`config/mail.ts`) | SMTP authentication username / account |
| `MAIL_PASSWORD` | Optional | `""` | String | Nodemailer (`config/mail.ts`) | SMTP authentication password |
| `MAIL_FROM` | Optional | `""` (falls back to `MAIL_USER`) | String | Nodemailer (`email.service.ts`) | Outbound email sender display address |

---

## 2. Client Environment Variables (`client/.env`)

Loaded by Vite and exposed to frontend client via `import.meta.env`.

| Variable Name | Required? | Prefix | Type | Consuming Module | Description / Purpose |
|---|---|---|---|---|---|
| `VITE_API_URL` | **Required** | `VITE_` | String | `client/src/lib/axios.ts` | Base API URL pointing to the server's `/api/v1` prefix |
| `VITE_RAZORPAY_KEY_ID` | Optional | `VITE_` | String | Razorpay Client SDK | Public Razorpay key ID for client checkout modal |

---

## 3. Recommended Template Configuration (`.env.example`)

For team onboarding and CI safety, both directories should maintain `.env.example` templates containing dummy variable names:

### Server `.env.example`
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/freelancr
JWT_ACCESS_SECRET=your_jwt_access_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
CLIENT_URL=http://localhost:5173
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_mail_username
MAIL_PASSWORD=your_mail_password
MAIL_FROM=no-reply@freelancr.com
```

### Client `.env.example`
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_RAZORPAY_KEY_ID=your_public_razorpay_key_id_here
```
