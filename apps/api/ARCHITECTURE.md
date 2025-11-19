# API Architecture Documentation

## 📁 Project Structure

```
src/
├── common/                          # Shared code across the application
│   ├── constants/                   # Application constants
│   │   ├── file.constants.ts       # File-related constants (extensions, paths, etc.)
│   │   └── index.ts
│   ├── interfaces/                  # TypeScript interfaces
│   │   ├── prediction.interface.ts  # Prediction-related types
│   │   ├── upload.interface.ts      # Upload-related types
│   │   └── index.ts
│   └── exceptions/                  # Custom exceptions
│       ├── file.exception.ts        # File-related exceptions
│       └── index.ts
│
├── modules/                         # Feature modules
│   ├── images/                      # Image management module
│   │   ├── images.controller.ts     # Image REST endpoints
│   │   ├── images.service.ts        # Image business logic
│   │   └── images.module.ts
│   ├── predictions/                 # Prediction management module
│   │   ├── predictions.controller.ts
│   │   ├── predictions.service.ts
│   │   └── predictions.module.ts
│   └── upload/                      # File upload module
│       ├── upload.controller.ts     # Upload endpoints
│       ├── upload.service.ts        # Upload orchestration
│       ├── file.service.ts          # File operations (extract, save, etc.)
│       └── upload.module.ts
│
├── database/                        # Database layer
│   ├── entities/                    # TypeORM entities
│   │   ├── image.entity.ts
│   │   ├── prediction.entity.ts
│   │   └── index.ts
│   ├── migrations/                  # Database migrations
│   └── database.module.ts
│
├── rabbitmq/                        # Message queue module
│   ├── rabbitmq.controller.ts       # Event handlers
│   ├── rabbitmq.service.ts          # Queue operations
│   └── rabbitmq.module.ts
│
├── dto/                             # Data Transfer Objects
│   ├── upload-image.dto.ts         # Upload request DTO
│   ├── image.dto.ts                # Image response DTO
│   └── prediction.dto.ts           # Prediction response DTO
│
├── app.module.ts                    # Root module
└── main.ts                          # Application entry point
```

## 🏗️ Architecture Principles

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain business logic
- **Repositories**: Data access layer (TypeORM)

### 2. **Module Organization**
Each feature is organized as a self-contained module with:
- Controller (API endpoints)
- Service (business logic)
- Module definition (dependencies)

### 3. **Shared Code**
- **Constants**: Centralized configuration values
- **Interfaces**: Type definitions shared across modules
- **Exceptions**: Custom error types

### 4. **Dependency Injection**
All dependencies are injected through constructors, making code testable and maintainable.

## 📋 Module Responsibilities

### **UploadModule**
- Handles file uploads (images and archives)
- Extracts images from ZIP files
- Validates file types
- Orchestrates image processing workflow

### **ImagesModule**
- Manages image metadata
- Serves image files
- Provides image query endpoints
- Links images to predictions

### **PredictionsModule**
- Manages prediction results
- Provides prediction query endpoints
- Links predictions to images

### **RabbitMQModule**
- Sends prediction requests to ML service
- Receives prediction results
- Manages message queue connections

## 🔄 Request Flow

### Upload Flow
```
Client → UploadController → UploadService → FileService
                                           ↓
                                     RabbitMQService
                                           ↓
                                     Queue (AMQP)
```

### Prediction Result Flow
```
Python Service → Queue → RabbitMQController → Database
```

### Query Flow
```
Client → ImagesController/PredictionsController → Service → Repository → Database
```

## 🎯 Best Practices Implemented

### Code Quality
- ✅ Single Responsibility Principle
- ✅ Dependency Injection
- ✅ Type Safety (TypeScript interfaces)
- ✅ Custom Exceptions for better error handling
- ✅ Consistent naming conventions

### Maintainability
- ✅ Clear folder structure
- ✅ Separated concerns
- ✅ Reusable services
- ✅ Centralized constants
- ✅ Documented code

### Scalability
- ✅ Modular architecture
- ✅ Async message queue integration
- ✅ Loose coupling between modules
- ✅ Easy to extend with new features

## 🚀 Adding New Features

### Adding a new endpoint
1. Add method to appropriate service
2. Add controller endpoint
3. Create/update DTOs if needed
4. Update Swagger documentation

### Adding a new module
1. Create folder in `src/modules/`
2. Create controller, service, and module files
3. Import in `app.module.ts`
4. Add necessary DTOs and interfaces

## 📝 Conventions

### Naming
- **Files**: `kebab-case.type.ts` (e.g., `images.service.ts`)
- **Classes**: `PascalCase` (e.g., `ImagesService`)
- **Interfaces**: `IPascalCase` (e.g., `IPredictionRequest`)
- **Constants**: `UPPER_SNAKE_CASE`

### File Organization
- One class per file
- Export barrel files (`index.ts`) for cleaner imports
- Group related files in folders

### Code Style
- Use dependency injection
- Async/await for asynchronous operations
- Proper error handling with custom exceptions
- Clear, descriptive variable names
- JSDoc comments for public methods
