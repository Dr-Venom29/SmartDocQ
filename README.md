# SmartDocQ — AI Document Assistant | Document Intelligence & Summarization Platform

**Live Demo:** [https://smartdocq.vercel.app](https://smartdocq.vercel.app)

In today's information-driven world, efficiently extracting insights from documents is crucial for academic success and professional productivity. The growing volume of digital documents presents challenges in comprehension, knowledge retention, and information retrieval. SmartDocQ is an intelligent document processing platform that leverages advanced AI technology to transform how users interact with their documents.

## Overview

SmartDocQ is a comprehensive full-stack web application that enables users to upload documents, engage with content through natural language queries, and generate educational resources automatically. By combining Retrieval-Augmented Generation (RAG) with Google's Gemini AI, the platform delivers accurate, context-aware responses while maintaining document privacy and security.

## Features

### Core Functionality
- **Document Upload & Processing**: Support for PDF, DOCX, and TXT files with intelligent text extraction and preprocessing
- **AI-Powered Chat**: Interactive question-answering system that provides context-aware responses based on uploaded documents
- **Quiz Generation**: Automatic creation of multiple-choice, true/false, and short-answer questions from document content
- **Flashcard Creation**: Smart extraction of key concepts and definitions for effective learning and revision
- **Text Summarization**: Concise summaries of document content for quick comprehension

### Security & Privacy
- **Sensitive Data Detection**: Automatic identification of personal information (emails, phone numbers, Aadhaar, PAN, credit cards, SSN)
- **User Consent Workflow**: Privacy-first approach requiring explicit consent before processing sensitive documents
- **Content Moderation**: Profanity filtering and URL validation to maintain platform integrity
- **Jailbreak Attempt Filtering**: Blocks common prompt-injection/jailbreak phrases in user questions before invoking retrieval/LLM
- **Hardened Error Handling**: Production-safe error responses return generic messages to clients while logging full server-side tracebacks. Detailed exception text is exposed only when `FLASK_DEBUG=1`, reducing information leakage and protecting internal service details.
- **httpOnly Cookie Authentication**: Secure user sessions with role-based access control (User, Admin, Moderator)
- **Server-Side Session Management**: Server-side session management with session invalidation and "logout from all devices" support
- **Centralized Server-Side Validation**: Auth and admin APIs validate all inputs with Zod schemas before any business logic or database access.
- **Strict Admin Authorization**: Admin endpoints are protected by middleware that requires an authenticated user with `isAdmin = true`; there are no hardcoded admin credentials or token backdoors.

### Administrative Tools
- **User Management**: Comprehensive admin dashboard for user oversight and role assignment
- **Document Analytics**: Track document uploads, processing status, and usage statistics
- **Report Management**: Handle user feedback and support inquiries efficiently
- **System Monitoring**: Real-time logs and performance metrics

## Technology Stack

### Frontend
- **React.js 18.x**: Modern component-based UI framework
- **React Router DOM**: Client-side routing and navigation
- **i18next**: Internationalization support
- **GSAP & Lottie**: Smooth animations and interactive elements
- **Focus Trap React**: Accessibility features

### Backend Middleware
- **Node.js & Express 5.x**: RESTful API server
- **Mongoose 8.x**: MongoDB object modeling
- **JWT & bcryptjs**: Authentication and password security
- **Multer**: File upload handling
- **CORS**: Cross-origin resource sharing configuration

### AI Service
- **Flask 3.x**: Python web framework for AI processing
- **Google Gemini 2.5 Flash**: Advanced text generation and comprehension
- **Text-Embedding-004**: High-quality vector embeddings
- **ChromaDB 0.5+**: Vector database for semantic search

### Document Processing
- **PyPDF2**: PDF text extraction
- **python-docx**: Microsoft Word document processing
- **Better Profanity**: Content filtering

### Database
- **MongoDB Atlas**: Primary NoSQL database for user data, documents, and chat history
- **ChromaDB**: Vector store for document embeddings and semantic retrieval

## Architecture

SmartDocQ follows a **three-tier microservice architecture**:

1. **Presentation Layer**: React.js frontend providing responsive user interface
2. **Business Logic Layer**: Node.js/Express middleware handling authentication, routing, and database operations
3. **AI Processing Layer**: Flask service managing document processing, embeddings, and AI interactions

This separation ensures scalability, maintainability, and efficient resource utilization.

## Index Lifecycle Management

The Flask AI service includes automatic vector index lifecycle management
to maintain retrieval quality as embedding models and preprocessing logic evolve.

Each ChromaDB vector stores metadata such as the embedding model, indexing
pipeline version, and indexing timestamp. Before retrieval, SmartDocQ verifies
vector compatibility and automatically triggers background reindexing when
stale or incompatible vectors are detected.

- Uses Contextual Chunk Headers to prepend document and optional sheet metadata to each chunk before embedding, improving retrieval accuracy while preserving clean chunk text for display and LLM context.

**This prevents:** silent retrieval degradation when upgrading embedding models
or modifying chunking and preprocessing strategies.

**Supported versioning:** embedding model, pipeline version, indexing timestamp

## Requirements

To set up SmartDocQ locally, you'll need:

- **Node.js**: Version 20.x or higher
- **Python**: Version 3.9 or higher
- **MongoDB**: Local installation or MongoDB Atlas account
- **Google AI API Key**: For Gemini AI access
- **Git**: Version control
- Basic understanding of web development and REST APIs

## Local Setup Instructions

### 1. Fork & Clone Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/SmartDocQ.git
cd SmartDocQ
```

### 2. Backend Middleware Setup (Node API)

```bash
# Navigate to servers directory
cd servers

# Install dependencies
npm install

# Create .env file with the following variables:
# PORT=5000
# MONGO_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret_key
# FRONTEND_ORIGINS=http://localhost:3000
# DNS_SERVERS=1.1.1.1,8.8.8.8  # optional; helps if Atlas DNS SRV lookups fail
# SERVICE_TOKEN=shared_strong_secret  # REQUIRED; must match backend SERVICE_TOKEN (used for x-service-token internal auth)
# FLASK_ASK_URL=http://localhost:5001/api/document/ask
# FLASK_INDEX_URL=http://localhost:5001/api/index-from-atlas
# FLASK_CONVERT_URL=http://localhost:5001/api/convert/word-to-pdf

# Start the server (Node API on http://localhost:5000)
npm start
```

### 3. AI Service Setup (Flask)

```bash
# Navigate to backend directory
cd ../backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with:
# PORT=5001
# FRONTEND_ORIGINS=http://localhost:3000
# NODE_BASE_URL=http://localhost:5000
# SERVICE_TOKEN=shared_strong_secret  # REQUIRED; must match servers SERVICE_TOKEN
# GEMINI_API_KEY=your_google_ai_api_key
# INDEX_BATCH_SIZE=64  # optional; Chroma flush size during indexing

# Start Flask service
python main.py
```

### 4. Frontend Setup (React)

```bash
# Navigate to my-app directory
cd ../my-app

# Install dependencies
npm install

# Create .env file with:
# REACT_APP_API_URL=http://localhost:5000
# REACT_APP_PY_API_URL=http://localhost:5001
# REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id

# Start development server
npm start
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

The application will be running with:
- Frontend: `http://localhost:3000`
- Backend API (Node): `http://localhost:5000`
- Flask AI Service: `http://localhost:5001`

## Usage Guide

1. **Register/Login**: Create an account or sign in to access the platform
2. **Upload Document**: Navigate to the upload page and select your document (PDF, DOCX, or TXT)
3. **Consent Review**: If sensitive data is detected, review and provide consent
4. **Chat**: Ask questions about your document and receive AI-powered answers
5. **Generate Quiz**: Create practice questions to test your understanding
6. **Create Flashcards**: Generate study cards for key concepts
7. **Summarize**: Get concise summaries of document sections
8. **Share**: Share chat conversations with others via unique links

## API Documentation

### Authentication Endpoints (Node API)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login (sets httpOnly cookie)
- `POST /api/auth/logout` - Logout (clears cookie)
- `POST /api/auth/logout-all` - Invalidate all active sessions across devices (marks all sessions inactive)
- `GET /api/auth/verify` - Verify session from cookie
 - `POST /api/auth/forgot-password` - Request password reset email (always returns a generic success message; Google-only accounts are instructed to continue with Google Sign-In)
 - `POST /api/auth/reset-password` - Reset password using a one-time, 15-minute token sent via email

### Document Endpoints (Node API)
- `POST /api/document/upload` - Upload single document
- `POST /api/document/upload/batch` - Upload multiple documents (up to 10)
- `GET /api/document/my` - List user documents (metadata)
- `GET /api/document/:id/download` - Download original/converted file
- `DELETE /api/document/:id` - Delete document

### Chat Endpoints (Node + Flask)
- `GET /api/chat/:documentId` - Get or create chat for a document
- `POST /api/chat/:documentId/message` - Send message and get AI answer (via Flask)
- `POST /api/chat/:documentId/append` - Append precomputed messages
- `PUT /api/chat/:documentId` - Overwrite entire chat
- `DELETE /api/chat/:documentId` - Delete chat for a document
- `DELETE /api/chat` - Delete all chats for current user
- `PATCH /api/chat/:documentId/message/:index/rating` - Rate an assistant message
- `GET /api/chat/:documentId/export.pdf` - Export chat as PDF

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/admin/stats` - System statistics

## Contributing

We welcome contributions from the community! Here's how you can help:

1. **Fork the Repository**: Click the "Fork" button at the top of this page
2. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
3. **Make Changes**: Implement your feature or bug fix
4. **Test Thoroughly**: Ensure all existing tests pass and add new tests if needed
5. **Commit Changes**: `git commit -m "Add meaningful commit message"`
6. **Push to Branch**: `git push origin feature/your-feature-name`
7. **Submit Pull Request**: Open a PR with a clear description of your changes

### Contribution Guidelines

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Update documentation for any API or feature changes
- Add unit tests for new functionality
- Ensure no sensitive data or API keys are committed

## Running Tests

Run the Python test suite (Flask AI service):

```bash
cd backend
# SERVICE_TOKEN is required (dummy value is OK for unit tests)
# PowerShell example:
#   $env:SERVICE_TOKEN="dev-token"
python -m pytest tests/ -v
```

## Deployment

SmartDocQ can be deployed on various platforms:

- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Backend**: Heroku, Railway, or AWS EC2
- **AI Service**: Heroku, Render, or Google Cloud Run
- **Database**: MongoDB Atlas (recommended)

Refer to `DEPLOYMENT_CHECKLIST.md` for detailed deployment instructions.

## Security Considerations

- All passwords are hashed using bcrypt with salt rounds
- **httpOnly Cookie Authentication**: JWT tokens stored in secure httpOnly cookies to prevent XSS attacks
- Cookies configured with `SameSite` and `Secure` flags in production
- Client-side user data validated with `safeParseUser()` to prevent corrupted/malicious data
- JWT tokens expire after 1 hour with automatic cleanup on logout
- **Sensitive Data Detection**: Advanced pattern-based detection with checksum/heuristic validation (Luhn for credit cards, Verhoeff for Aadhaar) and India-focused phone heuristics to reduce false positives
- Content moderation filters inappropriate content
- Shared chat links use high-entropy IDs, expire (~24h), and are rate-limited on the public endpoints
- CORS configured with credentials support for specific allowed origins
- Environment variables store sensitive configuration
- Cross-tab authentication sync for consistent session state

## Future Enhancements

- **Multilingual Support**: Document processing and AI responses in multiple languages
- **Advanced Analytics**: Detailed insights on document usage and learning patterns
- **Collaborative Features**: Shared workspaces and team document libraries
- **Mobile Application**: Native iOS and Android apps
- **Integration APIs**: Connect with learning management systems (LMS)
- **Voice Interaction**: Voice-based queries and responses
- **Offline Mode**: Local document processing without internet

## Acknowledgments

Special thanks to:
- Google AI team for Gemini API access
- The open-source community for excellent libraries and frameworks
- Contributors who have helped improve this project

## Contact & Support

For questions, issues, or feature requests:
- **Issues**: [GitHub Issues](https://github.com/SmartDocQ/SmartDocQ/issues)
- **Email**: smartdocq@gmail.com

## Contributors

Thanks to all the contributors who have helped build SmartDocQ:

<!-- ALL-CONTRIBUTORS-LIST:START -->
<table>
	<tr>
		<td align="center">
			<a href="https://github.com/Dr-Venom29">
				<img src="https://github.com/Dr-Venom29.png" width="100px;" alt=""/>
				<br />
				<sub><b>Dr-Venom29</b></sub>
			</a>
		</td>
		<td align="center">
			<a href="https://github.com/ANIRUDH-7600">
				<img src="https://github.com/ANIRUDH-7600.png" width="100px;" alt=""/>
				<br />
				<sub><b>ANIRUDH-7600</b></sub>
			</a>
		</td>
		<td align="center">
			<a href="https://github.com/sameekhsa">
				<img src="https://github.com/sameekhsa.png" width="100px;" alt=""/>
				<br />
				<sub><b>sameekhsa</b></sub>
			</a>
		</td>
		<td align="center">
			<a href="https://github.com/ananya-1507">
				<img src="https://github.com/ananya-1507.png" width="100px;" alt=""/>
				<br />
				<sub><b>ananya-1507</b></sub>
			</a>
		</td>
		<td align="center">
			<a href="https://github.com/srithi-05">
				<img src="https://github.com/srithi-05.png" width="100px;" alt=""/>
				<br />
				<sub><b>srithi-05</b></sub>
			</a>
		</td>
	</tr>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

---
