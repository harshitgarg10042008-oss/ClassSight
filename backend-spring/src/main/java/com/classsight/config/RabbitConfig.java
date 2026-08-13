package com.classsight.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;

@Configuration
@EnableRabbit
public class RabbitConfig {
    public static final String CAPTURE_EXCHANGE = "classsight.capture.exchange";
    public static final String RECOGNITION_EXCHANGE = "classsight.recognition.exchange";
    public static final String CAPTURE_QUEUE = "classsight.capture.recognition";
    public static final String RESULT_QUEUE = "classsight.recognition.result";
    public static final String DEAD_LETTER_QUEUE = "classsight.recognition.dead";

    @Bean public DirectExchange captureExchange() { return new DirectExchange(CAPTURE_EXCHANGE, true, false); }
    @Bean public DirectExchange recognitionExchange() { return new DirectExchange(RECOGNITION_EXCHANGE, true, false); }
    @Bean public Queue captureQueue() { return new Queue(CAPTURE_QUEUE, true); }
    @Bean public Queue resultQueue() { return new Queue(RESULT_QUEUE, true); }
    @Bean public Queue deadLetterQueue() { return new Queue(DEAD_LETTER_QUEUE, true); }
    @Bean public Binding captureBinding() { return BindingBuilder.bind(captureQueue()).to(captureExchange()).with("capture.request"); }
    @Bean public Binding resultBinding() { return BindingBuilder.bind(resultQueue()).to(recognitionExchange()).with("recognition.result"); }
    @Bean public Jackson2JsonMessageConverter rabbitMessageConverter() { return new Jackson2JsonMessageConverter(); }
    @Bean public RabbitTemplate rabbitTemplate(ConnectionFactory factory, Jackson2JsonMessageConverter converter) {
        RabbitTemplate template = new RabbitTemplate(factory);
        template.setMessageConverter(converter);
        return template;
    }
}

