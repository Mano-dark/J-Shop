import React, { useState, useEffect, useMemo } from "react";
// import { useCallback, useMemo } from "react";
import { Search, Package, ShoppingCart, BarChart, Plus } from "lucide-react";

const CATEGORIES = [
	"Articles de couture",
	"Alimentation",
	"Boissons",
	"Cosmétiques",
	"Fournitures scolaires",
	"Autres",
];

const GestionMagasin = () => {
	const [produits, setProduits] = useState([]);
	const [ventes, setVentes] = useState([]);
	const [recherche, setRecherche] = useState("");
	const [categorieFilter] = useState("Toutes");
	const [nouveauProduit, setNouveauProduit] = useState({
		nom: "",
		prix: "",
		stock: "",
		categorie: "Autres",
	});
	const [venteDuJour, setVenteDuJour] = useState({});
	const [moisActuel] = useState(new Date().getMonth());
	const [anneeActuelle] = useState(new Date().getFullYear());
	const [afficherFormulaire, setAfficherFormulaire] = useState(false);

	// Charger les données depuis localStorage
	useEffect(() => {
		const produitsStorages = localStorage.getItem("produits");
		const ventesStorages = localStorage.getItem("ventes");

		if (produitsStorages) {
			setProduits(JSON.parse(produitsStorages));
		}

		if (ventesStorages) {
			setVentes(JSON.parse(ventesStorages));
		}
	}, []);

	// Sauvegarder les données
	useEffect(() => {
		localStorage.setItem("produits", JSON.stringify(produits));
	}, [produits]);

	useEffect(() => {
		localStorage.setItem("ventes", JSON.stringify(ventes));
	}, [ventes]);

	/* The above code is using React's useState hook to create a state variable called `isLoading` and a
function to update it called `setIsLoading`. The initial value of `isLoading` is set to `false`.
This code is typically used in React functional components to manage state within the component. */
	// const [isLoading, setIsLoading] = useState(false);

	// Ajouter un nouveau produit
	const ajouterProduit = (e) => {
		e.preventDefault();
		if (nouveauProduit.nom && nouveauProduit.prix) {
			return;
		}
		setProduits((preProduits) => [
			...preProduits,
			{
				id: Date.now(),
				...nouveauProduit,
				prix: parseFloat(nouveauProduit.prix),
				stock: parseInt(nouveauProduit.stock) || 0,
				dateCreation: new Date().toLocaleDateString(),
			},
		]);
		setNouveauProduit({
			nom: "",
			prix: "",
			stock: "",
			categorie: "",
		});
		setAfficherFormulaire(false);
	};

	// Filtrer les produits
	const produitsFiltres = useMemo(() => {
		return produits.filter(
			(produit) =>
				categorieFilter === "" || produit.categorie === categorieFilter
		);
	}, [produits, categorieFilter]);
	// const produitsFiltres = produits.filter((produit) => {
	// 	const matchRecherche = produit.nom
	// 		.toLowerCase()
	// 		.includes(recherche.toLowerCase());
	// 	const matchCategorie =
	// 		categorieFilter === "Toutes" || produit.categorie === categorieFilter;
	// 	return matchRecherche && matchCategorie;
	// });

	// Enregistrer une vente //
	const enregistrerVente = (produitId, quantite) => {
		const produit = produits.find((p) => p.id === produitId);
		if (produit && quantite > 0) {
			const vente = {
				id: Date.now(),
				produitId,
				produitNom: produit.nom,
				quantite: parseInt(quantite),
				prix: produit.prix,
				total: produit.prix * parseInt(quantite),
				date: new Date().toLocaleDateString(),
				timestamp: Date.now(),
			};
			setVentes([...ventes, vente]);

			// Mettre à jour le stock
			setProduits(
				produits.map((p) =>
					p.id === produitId
						? { ...p, stock: Math.max(0, p.stock - parseInt(quantite)) }
						: p
				)
			);
		}
	};

	// Calculer les ventes du jour
	const ventesAujourdhui = ventes.filter(
		(vente) => vente.date === new Date().toLocaleDateString()
	);

	const totalJour = ventesAujourdhui.reduce(
		(sum, vente) => sum + vente.total,
		0
	);

	// Calculer les ventes mensuelles
	const ventesMensuelles = ventes.filter((vente) => {
		const dateVente = new Date(vente.timestamp);
		return (
			dateVente.getMonth() === moisActuel &&
			dateVente.getFullYear() === anneeActuelle
		);
	});

	const totalMoisActuel = ventesMensuelles.reduce(
		(sum, vente) => sum + vente.total,
		0
	);
	const quantiteMoisActuel = ventesMensuelles.reduce(
		(sum, vente) => sum + vente.quantite,
		0
	);

	// Statistiques par catégorie
	const ventesParCategorie = CATEGORIES.reduce((acc, categorie) => {
		acc[categorie] = ventes
			.filter((vente) => {
				const produit = produits.find((p) => p.id === vente.produitId);
				return produit?.categorie === categorie;
			})
			.reduce((sum, vente) => sum + vente.total, 0);
		return acc;
	}, {});

	return (
		<section className="container-fluid bg-light">
			<div className="row text-center mb-5 p-3">
				<h1 className="">Gestion de Magasin</h1>
			</div>

			{/* Statistiques rapides */}
			<div className="row d-flex justify-content-around mb-5">
				<div className="col-sm-3 p-2 bg-white green rounded-lg shadow-sm">
					<ShoppingCart color="#7F875E" size={35} className="mb-2" />
					<h5>Ventes du Jour</h5>
					<p className="c-green semibold ">{totalJour.toFixed(2)} XOF</p>
					<p className="text-sm text-gray-500">
						{ventesAujourdhui.length} transactions
					</p>
				</div>

				<div className="col-sm-3 bg-white p-2 rounded-lg shadow-sm">
					<BarChart color="#E3B025" size={35} className="mb-2" />
					<h5>Total Mensuel</h5>
					<p className="semibold c-yellow">{totalMoisActuel.toFixed(2)} XOF</p>
					<p className="text-sm text-gray-500">
						{quantiteMoisActuel} articles vendus
					</p>
				</div>

				<div className="col-sm-3 bg-white p-2 green rounded-lg shadow-sm">
					<Package color="#7F875E" size={35} className="mb-2" />
					<h5>Produits en Stock</h5>
					<p className="c-gray semibold">{produits.length}</p>
					<p className="text-sm text-gray-500">
						{produits.filter((p) => p.stock <= 5).length} en rupture
					</p>
				</div>
			</div>

			{/* Recherche et filtres */}
			<div className="container mb-3">
				<div className="container">
					<div className=" p-4 rounded-l mb-8">
						<div className="row d-flex flex-md-column justify-content-center">
							<div className="mb-3 d-flex justify-content-center">
								<Search className="search" />
								<input
									type="text"
									placeholder="Rechercher un produit..."
									value={recherche}
									onChange={(e) => setRecherche(e.target.value)}
									className="form-control search-input"
								/>
							</div>
							<div className="row d-flex justify-content-center">
								<button
									onClick={() => setAfficherFormulaire(!afficherFormulaire)}
									className="btn nouveau"
									data-toggle="modal"
									data-target="#new_product">
									<Plus className="h-4 w-4 mr-2" />
									Nouveau Produit
								</button>
							</div>
						</div>
					</div>

					{/* Formulaire d'ajout de produit */}
					{afficherFormulaire && (
						<div
							className="modal fade"
							id="new_product"
							tabIndex="-1"
							aria-labelledby="product"
							aria-hidden="true">
							<div className="modal-dialog" role="form">
								<div className="modal-content">
									<div className="row d-flex justify-content-between p-2">
										<div className="col-10">
											<h4
												className="modal-title text-center ms-5 c-green"
												id="product">
												Nouveau Produit
											</h4>
										</div>
										<div className="col-2 d-flex justify-content-end">
											<button
												type=""
												className=" close btn-white"
												data-dismiss="modal"
												aria-label="Close">
												<span aria-hidden="true">&times;</span>
											</button>
										</div>
									</div>
									<div className="modal-body ">
										<form>
											<div className="row d-flex justify-content-around">
												<div className="col-md-6">
													{/* <select
														value={categorieFilter}
														onChange={(e) => setCategorieFilter(e.target.value)}
														className="input">
														<option value="Toutes">
															Toutes les catégories
														</option>
														{CATEGORIES.map((cat) => (
															<option key={cat} value={cat}>
																{cat}
															</option>
														))}
													</select> */}
													<select
														value={nouveauProduit.categorie}
														onChange={(e) =>
															setNouveauProduit({
																...nouveauProduit,
																categorie: e.target.value,
															})
														}
														className="input">
														{CATEGORIES.map((cat) => (
															<option key={cat} value={cat}>
																{cat}
															</option>
														))}
													</select>
												</div>
												<div className="col-md-6">
													<input
														type="text"
														placeholder="Nom du produit"
														value={nouveauProduit.nom}
														onChange={(e) =>
															setNouveauProduit({
																...nouveauProduit,
																nom: e.target.value,
															})
														}
														className="input"
														required
													/>
												</div>
											</div>

											<div className="row d-flex justify-content-around mt-2">
												<div className="col-md-6">
													<input
														type="number"
														step="0.01"
														placeholder="Prix (XOF)"
														value={nouveauProduit.prix}
														onChange={(e) =>
															setNouveauProduit({
																...nouveauProduit,
																prix: e.target.value,
															})
														}
														className="input"
														required
													/>
												</div>
												<div className="col-md-6">
													<input
														type="number"
														placeholder="Stock initial"
														value={nouveauProduit.stock}
														onChange={(e) =>
															setNouveauProduit({
																...nouveauProduit,
																stock: e.target.value,
															})
														}
														className="input"
													/>
												</div>
											</div>
										</form>
									</div>
									<div className="modal-footer">
										<button
											type="button"
											class="btn btn-secondary"
											data-dismiss="modal">
											Close
										</button>
										<button
											onClick={() => {
												if (nouveauProduit.nom && nouveauProduit.prix) {
													ajouterProduit({});
												}
											}}
											className="ajouter">
											Ajouter
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Liste des produits */}
			<div className="row bg-white p-2 ">
				<h2 className="h5 mb-0 text-dark">
					Inventaire des Produits ({produitsFiltres.length})
				</h2>
			</div>
			<div className="row shadow-sm mb-4 mt-2">
				<div className="container">
					<div className="table-responsive">
						<table className="table table-striped table-hover mb-0">
							<thead className="thead-green">
								<tr>
									<th className="py-3 fw-medium text-uppercase small text-muted">
										Produit
									</th>
									<th className="py-3 fw-medium text-uppercase small text-muted">
										Catégorie
									</th>
									<th className="py-3 fw-medium text-uppercase small text-muted">
										Prix
									</th>
									<th className="py-3 fw-medium text-uppercase small text-muted">
										Stock
									</th>
									<th className="py-3 fw-medium text-uppercase small text-muted">
										Vendre
									</th>
								</tr>
							</thead>
							<tbody>
								{produitsFiltres.map((produit) => (
									<tr
										key={produit.id}
										className={
											produit.stock <= 5
												? "table-danger bg-danger bg-opacity-10"
												: ""
										}>
										<td className="py-3">
											<div>
												<div className="fw-medium text-dark">{produit.nom}</div>
												<div className="small text-muted">
													Ajouté le {produit.dateCreation}
												</div>
											</div>
										</td>
										<td className="py-3">
											<span className="badge bg-primary bg-opacity-10 text-primary">
												{produit.categorie}
											</span>
										</td>
										<td className="py-3 text-dark">
											{produit.prix.toFixed(2)} XOF
										</td>
										<td className="py-3">
											<span
												className={`${
													produit.stock <= 5
														? "text-danger fw-bold"
														: "text-dark"
												}`}>
												{produit.stock}
												{produit.stock <= 5 && " ⚠️"}
											</span>
										</td>
										<td className="py-3">
											<div className="d-flex align-items-center gap-2">
												<input
													type="number"
													min="1"
													max={produit.stock}
													placeholder="Qté"
													onChange={(e) =>
														setVenteDuJour({
															...venteDuJour,
															[produit.id]: e.target.value,
														})
													}
													value={venteDuJour[produit.id] || ""}
													className="form-control form-control-sm"
													style={{ width: "80px" }}
												/>
												<button
													onClick={() => {
														enregistrerVente(
															produit.id,
															venteDuJour[produit.id]
														);
														setVenteDuJour({
															...venteDuJour,
															[produit.id]: "",
														});
													}}
													disabled={
														!venteDuJour[produit.id] ||
														venteDuJour[produit.id] > produit.stock
													}
													className="btn btn-success btn-sm">
													Vendre
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Statistiques par catégorie */}
			<div className="mt-5 card shadow p-4">
				<h2 className="h5 fw-semibold text-dark mb-3">
					Ventes par Catégorie (Mois Actuel)
				</h2>
				<div className="row g-3">
					{CATEGORIES.map((categorie) => (
						<div key={categorie} className="col-6 col-md-4">
							<div className="bg-light p-3 rounded">
								<h3 className="small fw-medium text-muted mb-1">{categorie}</h3>
								<p className="mb-0 fs-5 fw-bold text-dark">
									{ventesParCategorie[categorie]?.toFixed(2) || "0.00"} XOF
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default GestionMagasin;
