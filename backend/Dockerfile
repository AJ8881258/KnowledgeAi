FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace/backend

COPY .mvn .mvn
COPY mvnw mvnw.cmd pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system knowflow && adduser --system --ingroup knowflow knowflow

COPY --from=build /workspace/backend/target/knowflow-backend-0.0.1-SNAPSHOT.jar app.jar

USER knowflow

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
