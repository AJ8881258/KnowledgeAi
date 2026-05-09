package com.knowflow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.knowflow.backend.config.JwtProperties;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class KnowflowBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(KnowflowBackendApplication.class, args);
	}

}
