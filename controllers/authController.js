import { response, request } from 'express';
import userModel from '../models/userModel.js';
import generateJWT from '../helpers/generateJWT.js';
import generateToken from '../helpers/generateToken.js';
import emailRegister from '../helpers/emailRegister.js';
import emailResetPass from '../helpers/emailResetPass.js';

const authUser = async ( req = request, res = response ) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if ( !user ) return res.status(400).json({ ok: false, msg: 'No existe un usuario con este email' });
    if ( !user.confirmed ) return res.status(400).json({ ok: false, msg: 'Falta confirmar su correo electronico' });

    const validPassword = await user.matchPassword( password );
    if ( !validPassword ) return res.status(400).json({ ok: false, msg: 'Email o contraseña incorrecto' });

    const { _id, name } = user;

    return res.status(201).json({ 
      ok: true,
      _id,
      name,
      email,
      jwt:  generateJWT( _id, name ),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error del sistema, comuniquese con el administrador' 
    });
  }
}

const createUser = async ( req = request, res = response ) => {
  const { email, name } = req.body;

  try {
    const userExist = await userModel.findOne({ email });
    if ( userExist ) return res.status(400).json({ ok: false, msg: 'El email ya está en uso' });

    const user = new userModel( req.body )
    const savedUser = await user.save();
    const { _id, token } = savedUser;

    emailRegister({
      email,
      name,
      token
    })

    return res.status(201).json({ 
      ok: true,
      msg: 'Hemos enviado las instrucciones a tu correo electrónico'
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error del sistema, comuniquese con el administrador' 
    });
  }
}

const revalidateToken = ( req = request, res = response ) => {
  const { _id, name, email } = req.user;

  res.status(201).json({ 
    ok: true,
    jwt: generateJWT( _id, name ),
    _id,
    name,
    email,
  });
}

const confirmAccount = async ( req = request, res = response ) => {
  const { token } = req.params;

  try {
    const user = await userModel.findOne({ token });
    if ( !user ) return res.status(404).json({ ok: false, msg: 'Token no válido o expirado' });
    if ( user.confirmed ) return res.status(401).json({ ok: false, msg: 'Su cuenta ya ha sido confirmada anteriormente, por lo que no es necesario que intente confirmarla de nuevo. Por favor, utilice la información de inicio de sesión que se le proporcionó anteriormente para acceder a su cuenta.' });

    user.confirmed = true;
    user.token = null;
    await user.save();

    return res.status(201).json({
      ok: true,
      msg: 'cuenta confirmada correctamente'
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error del sistema, comuniquese con el administrador' 
    });
  }
}

const ForgotPassword = async ( req = request, res = response ) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if ( !user ) return res.status(404).json({ ok: false, msg: 'No existe un usuario con ese correo electronico' });
    if ( !user.confirmed ) return res.status(401).json({ ok: false, msg: 'falta confirmar su correo electronico' });

    user.token = generateToken();
    const { name, token } = await user.save();

    emailResetPass({
      email,
      name,
      token,
    });

    return res.status(201).json({
      ok: true,
      msg: 'Hemos enviado las instrucciones a su correo electrónico'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error del sistema, comuniquese con el administrador'
    })
  }
}

const confirmToken = async ( req = request, res = response ) => {
  const { token } = req.params;

  try {
    const user = await userModel.findOne({ token });
    if ( !user ) return res.status(404).json({ ok: false, msg: 'Usuario no registrado' });
    if ( !user.confirmed ) return res.status(401).json({ ok: false, msg: 'falta confirmar su correo electronico' });

    return res.status(201).json({
      ok: true,
      msg: 'Por favor, ingrese su nueva contraseña'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error del sistema, comuniquese con el administrador'
    })
  }
}

const newPassword = async ( req = request, res = response ) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await userModel.findOne({ token });
    if ( !user ) return res.status(404).json({ ok: false, msg: 'Token no válido o expirado' });
    if ( !user.confirmed ) return res.status(401).json({ ok: false, msg: 'falta confirmar su correo electronico' });

    user.token = null;
    user.password = password;
    const newUser = await user.save();
    console.log(newUser);

    const { _id, email, name } = newUser;
    return res.status(200).json({
      ok: true,
      email,
      name,
      jwt:  generateJWT( _id, name ),
      msg: 'Contraseña actualizada correctamente'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error del sistema, comuniquese con el administrador'
    })
  }
}

const profile = async ( req = request, res = response ) => {
  const { _id, name, email } = req.user;

  try {
    return res.status(200).json({
      ok: true,
      _id,
      name,
      email,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error del sistema, comuniquese con el administrador'
    })
  }
}

const changeProfile = async ( req = request, res = response ) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    const user = await userModel.findById( id );
    if ( !user ) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    if ( !user.confirmed ) return res.status(401).json({ ok: false, msg: 'falta confirmar su correo electronico' });

    if ( user.email !== email ) {
      const emailExist = await userModel.findOne({ email });
      if ( emailExist ) return res.status(400).json({ ok: false, msg: 'El email ya está en uso' });
    }

    const newUser = {
      ...req.body,
    }
    const updateUser = await userModel.findByIdAndUpdate( id, newUser, { new: true } );

    return res.status(200).json({
      ok: true,
      user: updateUser,
      msg: 'Perfil actualizado correctamente'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error del sistema, comuniquese con el administrador'
    })
  }
}

const changePasswordProfile = async ( req = request, res = response ) => {
  const { _id } = req.user;
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await userModel.findById( _id );
    if ( !user ) return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    if ( !user.confirmed ) return res.status(401).json({ ok: false, msg: 'falta confirmar su correo electronico' });

    const validPassword = await user.matchPassword( oldPassword );
    if ( !validPassword ) return res.status(404).json({ ok: false, msg: 'La contraseña actual es incorrecta' });

    user.password = newPassword;
    await user.save();
    
    return res.status(200).json({
      ok: true,
      msg: 'Contraseña actualizada correctamente'
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: 'Error del sistema, comuniquese con el administrador'
    })
  }
}

export {
  authUser,
  createUser,
  revalidateToken,
  confirmAccount,
  ForgotPassword,
  confirmToken,
  newPassword,
  profile,
  changeProfile,
  changePasswordProfile,
}