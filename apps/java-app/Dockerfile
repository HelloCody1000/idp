FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/java-app.jar app.jar

EXPOSE 3000
CMD ["java", "-jar", "app.jar"]
