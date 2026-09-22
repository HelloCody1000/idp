FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /src
COPY Main.java .
RUN javac Main.java

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /src/Main.class .

EXPOSE 3000
CMD ["java", "Main"]
