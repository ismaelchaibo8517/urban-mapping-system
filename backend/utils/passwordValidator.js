const passwordValidator = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!regex.test(password)) {
        return {
            valid: false,
            message: 'Senha deve ter: mínimo 8 caracteres, 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&)'
        };
    }
    
    return { valid: true, message: 'Senha válida' };
};

module.exports = passwordValidator;