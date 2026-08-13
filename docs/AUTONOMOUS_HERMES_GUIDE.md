# Autonomous Hermes Guide

Use bounded autonomy. Hermes should continue routine implementation, recovery, testing, documentation, and queue progression without confirmation. It should request direction only for consequential choices defined in `09-hermes/STOP_CONDITIONS.yaml`.

The project owner should answer direction requests using:

- **Decision ID:**
- **Selected option:**
- **Reason:**
- **Additional constraint:**
- **Approved by:**

Hermes then records the decision and resumes the first unblocked queue item.
