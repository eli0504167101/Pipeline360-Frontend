FROM nginx:alpine
# מעתיק רק את התוכן של תיקיית src לתוך תיקיית ההגשה של Nginx
COPY frontend-repo/src/ /usr/share/nginx/html/
EXPOSE 80