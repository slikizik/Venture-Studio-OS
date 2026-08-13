# Authentication and Ownership

## MVP decision

VSO v0.1.0 is a local, single-owner application.

- No login screen is required.
- All human actions are attributed to one configured `Project Owner`.
- AI and human agent records remain separate from the owner identity.
- Multi-user authentication, authorization, invitations, and cloud accounts are deferred.
- The architecture must avoid assumptions that prevent future multi-user support.

The owner profile is stored in local configuration and may include display name and timezone. No password is required in the MVP.
