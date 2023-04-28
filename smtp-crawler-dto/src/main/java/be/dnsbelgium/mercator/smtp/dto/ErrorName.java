package be.dnsbelgium.mercator.smtp.dto;

public enum ErrorName {
  TIME_OUT,
  CONNECTION_ERROR,
  CERTIFICATE_ERROR,
  HOST_UNREACHABLE,
  SKIPPED,
  CHANNEL_CLOSED,
  OTHER
}
