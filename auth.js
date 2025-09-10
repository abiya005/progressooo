function enableSignup() {
  const fields = document.querySelectorAll('.signup-form input');
  fields.forEach(field => {
    field.disabled = false;
  });
}
