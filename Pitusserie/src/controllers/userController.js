const bcrypt = require('bcrypt');
const {check, validationResult, body, cookie} = require('express-validator');

const db = require('../database/models/index.js');

module.exports = {
    login: function(req, res) {
        res.render('login', {
            session: req.session.usuario
        })
    },
    register: function(req, res) {
        res.render('register', {
            session: req.session.usuario
        });
    },
    perfil: function(req, res) {
		res.render('perfil', {
            session: req.session.usuario
        });
    },
    cart: function(req, res) {
        db.User.findByPk(req.session.usuario.id , {
            include: [{association: 'product'}]
          })
        .then(function (usuario) {
            res.render('cart', {
                productos: usuario.product,
                id:req.params.id,
                session: req.session.usuario
            });
        })
    },
    confirmarCompra: function(req, res) {
        let filtroIds = []
        let productosCartYCantidad = []
        let precioFinal = 0
        if(typeof(req.body.qty) != 'object') {
            req.body.qty = [req.body.qty]
        }
        req.body.qty.forEach(function(elemento) {
            filtroIds.push({id: elemento.split('-')[1]})
        });
        db.Product.findAll({
            where: {
                [db.Sequelize.Op.or]: filtroIds
            }
        })
        .then(function(productosCart) {
            req.body.qty.forEach(function(elemento) {
                productosCartYCantidad.push({
                    cantidad: elemento.split('-')[0],
                    producto: productosCart.filter(producto => producto.id == elemento.split('-')[1])[0]
                });
                filtroIds.push({id: elemento.split('-')[1]})
            });
            productosCartYCantidad.forEach(function(elemento) {
                precioFinal += (elemento.cantidad * elemento.producto.price);
            })
        })
        .then(function() {
            res.render('confirmarCompra', {
                session: req.session.usuario,
                productos: productosCartYCantidad,
                precioFinal: precioFinal
            });
        })
    },
    cartAdd: function(req, res) {
        db.Product_User.findAll({
            where: {
                id_users: req.session.usuario.id,
                id_products: req.params.id
            }
        })
        .then(function(productos) {
            if(productos.length == 0) {
                db.Product_User.create({
                    id_users: req.session.usuario.id,
                    id_products: req.params.id
                })
            }
        })
        .then(function() {
            res.redirect('back')
        })
    },
    cartComprar: function(req, res) {
        db.Product_User.findAll({
            where: {
                id_users: req.session.usuario.id,
                id_products: req.params.id
            }
        })
        .then(function(productos) {
            if(productos.length == 0) {
                db.Product_User.create({
                    id_users: req.session.usuario.id,
                    id_products: req.params.id
                })
                .then(function() {
                    res.redirect('/users/cart');
                })
            } else {
                res.redirect('/users/cart');
            }
        })
    },
    cartDestroy: function (req, res) {
        db.Product_User.destroy({
            where: {
                id_users: req.session.usuario.id,
                id_products: req.params.id
            }
        })
        .then(function () {
            res.redirect('/users/cart')
        })
    },
    cantidadCart: function(req, res) {
        db.Product_User.findAll({
            where: {
                id_users: req.session.usuario.id
            }
        })
        .then(function(productos) {
            res.json(productos.length)
        })
    },
    verify: function (req, res) {
        let errors = validationResult(req);
        if (errors.isEmpty()) {
            db.User.findAll()
            .then(function (usuarios) {
                for (let i = 0; i < usuarios.length; i++) {
                    if (usuarios[i].email == req.body.email && bcrypt.compareSync(req.body.contrasena, usuarios[i].password)) {
                        req.session.usuario = {
                            id: usuarios[i].id,
                            nombre: usuarios[i].name,
                            apellido: usuarios[i].surname,
                            dni: usuarios[i].dni,
                            telefono: usuarios[i].phone,
                            email: usuarios[i].email,
                            img: usuarios[i].img,
                            administrador: usuarios[i].admin
                        }
                        if (req.body.recordarme == 'on') {
                            res.cookie('authRemember', usuarios[i].email, { maxAge: 60000 * 60 * 24 * 90 })
                        }
                        return res.redirect('/')
                    }
                }
                return res.render('login', {
                    errors: {
                        email: {
                            msg: 'Credenciales inv??lidas. Inserta un email registrado y su respectiva contrase??a'
                        }
                    },
                    session: req.session.usuario
                })
            })
        } else {
            res.render('login', {
                errors: errors.mapped(),
                old: req.body,
                session: req.session.usuario
            })
        }
    },
    store: (req, res) => {
        let errors = validationResult(req)
        if(errors.isEmpty()){
            db.User.findAll()
            .then(function(usuarios) {
                for(i = 0; i < usuarios.length; i++) {
                    if(usuarios[i].email == req.body.email) {
                        return res.render('register', {
                            errors: {
                                email: {
                                    msg: 'Este email ya se encuentra registrado en pitusserie'
                                }
                            },
                            old: req.body,
                            session: req.session.usuario
                        })
                    }
                }
                db.User.create({
                    name: req.body.nombre,
                    surname: req.body.apellido,
                    dni: req.body.dni,
                    phone: req.body.telefono,
                    email: req.body.email,
                    password: bcrypt.hashSync(req.body.contrasena1, 10),
                    img: req.files[0].filename
                })
                res.redirect('/users/login');
            })
        } else{
            res.render('register', {
                errors: errors.mapped(),
                old: req.body,
                session: req.session.usuario
            })
        }
    },
    update: function(req, res) {
        let errors = validationResult(req);
        if(errors.isEmpty()){
            db.User.findAll()
            .then(function(usuarios) {
                for(i = 0; i < usuarios.length; i++) {
                    if(usuarios[i].email == req.body.email) {
                        return res.render('editUsers', {
                            errors: {
                                email: {
                                    msg: 'Este email ya se encuentra registrado en pitusserie'
                                }
                            },
                            session: req.session.usuario
                        })
                    }
                }
                db.User.update({
                    name: req.body.nombre,
                    surname: req.body.apellido,
                    dni: req.body.dni,
                    phone: req.body.telefono,
                    email: req.body.email
                },
                {
                    where: {
                        id: req.session.usuario.id
                    }
                })
                req.session.destroy();
                res.cookie('authRemember', '', {maxAge: -1})
                res.redirect('/users/login');
            })
        } else {
            res.render('editUsers', {
                errors: errors.mapped(),
                session: req.session.usuario
            })
        }
    },
    edit: (req, res) => {
		res.render('editUsers', {
			session: req.session.usuario
		});
    },
    destroy: function (req, res) {
        db.User.destroy({
            where: {
                id: req.session.usuario.id
            }
        })
            .then(function (resultado) {
                req.session.destroy();
                res.cookie('authRemember', '', { maxAge: -1 })
                res.redirect('/')
            })
    },
    cerrarSession: function(req, res) {
        req.session.destroy();
        res.cookie('authRemember', '', {maxAge: -1})
        res.redirect('/');
    }
}