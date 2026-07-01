FROM nginx:alpine
# מוריד את ה-frontend-repo מהנתיב כי אנחנו כבר בתוכו
COPY src/ /usr/share/nginx/html/
EXPOSE 80