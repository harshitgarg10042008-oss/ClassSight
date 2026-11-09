# Node 24 matches the toolchain that produces a correct prerender locally.
# When built with npm run build on host, .next/standalone contains the full
# <!DOCTYPE>/<html>/<body> shell, ensuring perfect browser hydration.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Force Next.js standalone server to bind on all interfaces (0.0.0.0)
# so it is reachable via localhost on the host machine.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY .next/standalone ./
COPY .next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
