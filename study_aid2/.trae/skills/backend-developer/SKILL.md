---
name: "backend-developer"
description: "Provides backend development expertise including API design, database management, server architecture, microservices, authentication, and performance optimization. Invoke when user needs help with backend development, API implementation, or server-side logic."
---

# Backend Developer

This skill provides comprehensive backend development support for web applications, APIs, and server-side systems.

## Core Capabilities

### Backend Frameworks & Languages
- Node.js (Express, Fastify, NestJS, Koa)
- Python (Django, Flask, FastAPI, Tornado)
- Java (Spring Boot, Jakarta EE)
- Go (Gin, Echo, Fiber)
- C# (.NET Core, ASP.NET)
- Ruby (Rails, Sinatra)
- PHP (Laravel, Symfony)

### API Design & Development
- RESTful API design and implementation
- GraphQL (Apollo, Hot Chocolate)
- WebSocket and real-time communication
- gRPC and Protocol Buffers
- API versioning strategies
- API documentation (OpenAPI/Swagger)
- Rate limiting and throttling
- API gateway patterns

### Database Management
- Relational Databases (PostgreSQL, MySQL, SQL Server)
- NoSQL Databases (MongoDB, Redis, Cassandra)
- Time-series Databases (InfluxDB, TimescaleDB)
- Database design and schema optimization
- Query optimization and indexing
- Database migrations
- ORM/ODM usage (Sequelize, TypeORM, Prisma, Mongoose)
- Database replication and sharding

### Authentication & Authorization
- JWT (JSON Web Tokens)
- OAuth 2.0 and OpenID Connect
- Session-based authentication
- API key authentication
- Role-based access control (RBAC)
- Permission-based access control (PBAC)
- Multi-factor authentication (MFA)
- SSO (Single Sign-On)

### Server Architecture
- Monolithic architecture
- Microservices architecture
- Serverless (AWS Lambda, Azure Functions)
- Event-driven architecture
- CQRS (Command Query Responsibility Segregation)
- Event sourcing
- Message queues and brokers (RabbitMQ, Kafka, Redis)
- Service mesh (Istio, Linkerd)

### Performance & Scalability
- Caching strategies (Redis, Memcached)
- Load balancing (Nginx, HAProxy, AWS ALB)
- Horizontal and vertical scaling
- Database connection pooling
- Query optimization and indexing
- CDN integration
- Async processing and job queues
- Performance monitoring and profiling

### Security
- Input validation and sanitization
- SQL injection prevention
- XSS and CSRF protection
- CORS configuration
- Data encryption at rest and in transit
- Security headers (CSP, HSTS, X-Frame-Options)
- API security best practices
- OWASP Top 10 mitigation

### DevOps & Deployment
- Docker and containerization
- Kubernetes orchestration
- CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Infrastructure as Code (Terraform, CloudFormation)
- Monitoring and logging (Prometheus, Grafana, ELK Stack)
- Error tracking (Sentry, Rollbar)
- Health checks and readiness probes
- Blue-green and canary deployments

## When to Use This Skill

Invoke this skill when user:
- Needs help with backend framework setup (Node.js, Python, Java, etc.)
- Asks for API design or implementation
- Wants to design database schemas
- Needs help with authentication and authorization
- Asks about performance optimization
- Wants to implement caching strategies
- Needs help with microservices architecture
- Asks about security best practices
- Wants to set up CI/CD pipelines
- Needs help with database optimization
- Asks about real-time features (WebSockets, SSE)
- Wants to implement rate limiting
- Needs help with API documentation
- Asks about server deployment strategies
- Wants to implement message queues
- Needs help with error handling and logging

## Working Guidelines

1. **Security First**: Always consider security implications
2. **Performance**: Optimize for scalability and performance
3. **API Design**: Follow RESTful or GraphQL best practices
4. **Error Handling**: Implement proper error handling and logging
5. **Testing**: Write unit, integration, and E2E tests
6. **Documentation**: Document APIs and architecture decisions
7. **Monitoring**: Implement proper monitoring and alerting
8. **Code Quality**: Follow clean code principles and SOLID

## Common Patterns

### API Design Patterns
- RESTful resource naming
- Consistent response formats
- Proper HTTP status codes
- Pagination and filtering
- Versioning strategies
- HATEOAS (Hypermedia as the Engine of Application State)

### Database Patterns
- Repository pattern
- Unit of Work pattern
- Data Mapper pattern
- Active Record pattern
- Query Object pattern
- Database sharding strategies
- Read replicas and write masters

### Authentication Patterns
- JWT token rotation
- Refresh token strategy
- OAuth 2.0 flows (Authorization Code, Client Credentials)
- API key management
- Session management
- Password hashing (bcrypt, Argon2)

### Caching Patterns
- Cache-aside pattern
- Write-through cache
- Write-behind cache
- Cache invalidation strategies
- Distributed caching
- Cache warming

## Best Practices

### API Development
- Use proper HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Implement proper error responses
- Use consistent response formats
- Implement rate limiting
- Validate all input data
- Use HTTPS in production
- Implement proper logging
- Document APIs with OpenAPI/Swagger

### Database Design
- Normalize data appropriately
- Use proper data types
- Implement proper indexing
- Use foreign keys for relationships
- Implement soft deletes
- Use transactions for data consistency
- Optimize queries
- Use connection pooling

### Security
- Never trust user input
- Use parameterized queries
- Implement proper authentication
- Use HTTPS/TLS
- Implement rate limiting
- Sanitize all outputs
- Use security headers
- Regularly update dependencies

### Performance
- Use caching where appropriate
- Optimize database queries
- Use connection pooling
- Implement lazy loading
- Use async/await for I/O operations
- Implement proper indexing
- Monitor performance metrics
- Use load balancing

### Error Handling
- Use proper HTTP status codes
- Provide meaningful error messages
- Log errors appropriately
- Implement retry logic for transient failures
- Use circuit breakers for external services
- Implement graceful degradation
- Provide fallback mechanisms

## Testing Strategies

### Unit Testing
- Test business logic in isolation
- Mock external dependencies
- Test edge cases
- Achieve high code coverage

### Integration Testing
- Test API endpoints
- Test database interactions
- Test external service integrations
- Test authentication flows

### E2E Testing
- Test complete user flows
- Test system integrations
- Test performance under load
- Test failure scenarios

### Load Testing
- Test system under high load
- Identify performance bottlenecks
- Test auto-scaling
- Test database performance

## Output Formats

This skill can help create:
- API endpoints and routes
- Database schemas and migrations
- Authentication and authorization implementations
- Caching strategies
- Microservices architecture designs
- CI/CD pipeline configurations
- Docker and Kubernetes configurations
- API documentation (OpenAPI/Swagger)
- Performance optimization strategies
- Security implementations
- Monitoring and logging configurations

## Common Libraries & Tools

### Node.js Ecosystem
- Frameworks: Express, Fastify, NestJS, Koa
- ORM: Sequelize, TypeORM, Prisma, Mongoose
- Validation: Joi, Yup, Zod, class-validator
- Authentication: Passport, JWT, OAuth2orize
- Testing: Jest, Mocha, Chai, Supertest
- Task Queues: Bull, Agenda, RabbitMQ
- Caching: Redis, Node-cache

### Python Ecosystem
- Frameworks: Django, Flask, FastAPI, Tornado
- ORM: Django ORM, SQLAlchemy, Tortoise ORM
- Validation: Pydantic, Marshmallow
- Authentication: Django Auth, Flask-Login, Authlib
- Testing: pytest, unittest, PyTest-Asyncio
- Task Queues: Celery, RQ, Dramatiq
- Caching: Redis, Memcached

### Java Ecosystem
- Frameworks: Spring Boot, Jakarta EE, Micronaut
- ORM: Hibernate, JPA, MyBatis
- Validation: Hibernate Validator, Bean Validation
- Authentication: Spring Security, Apache Shiro
- Testing: JUnit, Mockito, TestContainers
- Task Queues: Spring Batch, RabbitMQ
- Caching: Spring Cache, Redis

### Database Tools
- PostgreSQL: pgAdmin, DBeaver, DataGrip
- MySQL: MySQL Workbench, DBeaver
- MongoDB: MongoDB Compass, Studio 3T
- Redis: RedisInsight, Another Redis Desktop Manager
- Migrations: Flyway, Liquibase

### DevOps Tools
- Containerization: Docker, Podman
- Orchestration: Kubernetes, Docker Swarm
- CI/CD: GitHub Actions, GitLab CI, Jenkins, CircleCI
- IaC: Terraform, CloudFormation, Pulumi
- Monitoring: Prometheus, Grafana, Datadog, New Relic
- Logging: ELK Stack, Splunk, CloudWatch

## Security Best Practices

- Use strong password hashing (bcrypt, Argon2)
- Implement proper authentication flows
- Use HTTPS/TLS for all communications
- Validate and sanitize all inputs
- Use parameterized queries
- Implement rate limiting
- Use security headers (CSP, HSTS, X-Frame-Options)
- Regularly update dependencies
- Implement proper error handling (don't leak sensitive info)
- Use secrets management (Vault, AWS Secrets Manager)
- Implement audit logging
- Use principle of least privilege
- Regular security audits and penetration testing
